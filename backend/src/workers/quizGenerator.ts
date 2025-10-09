import Queue from 'bull';
import { Quiz, PDF } from '../models';
import { chromaHelper } from '../utils/chromaHelper';
import aiService from '../services/aiService';
import { buildMCQGenerationPrompt, buildSAQGenerationPrompt, buildLAQGenerationPrompt } from '../utils/quizPrompts';
import { logger } from '../utils/logger';
import { getCollection } from '../config/chromadb';

class QuizGenerator {
  async generateQuiz(job: Queue.Job) {
    const { quizId, pdfId, options } = job.data as any;

    try {
      await Quiz.findByIdAndUpdate(quizId, { status: 'generating', generationError: null });
      job.progress(10);
      logger.info(`Quiz ${quizId}: Status updated to generating`);

      job.progress(20);
      logger.info(`Quiz ${quizId}: Fetching PDF content`);
      const pdfContent = await this.fetchPDFContent(pdfId);
      if (!pdfContent || pdfContent.length < 100) {
        throw new Error('Insufficient PDF content for quiz generation');
      }

      const allQuestions: any[] = [];

      if (options.mcqCount > 0) {
        job.progress(30);
        logger.info(`Quiz ${quizId}: Generating ${options.mcqCount} MCQs`);
        const mcqs = await this.generateMCQs(pdfContent, options.mcqCount, options.difficulty);
        allQuestions.push(...mcqs);
      }

      if (options.saqCount > 0) {
        job.progress(60);
        logger.info(`Quiz ${quizId}: Generating ${options.saqCount} SAQs`);
        const saqs = await this.generateSAQs(pdfContent, options.saqCount, options.difficulty);
        allQuestions.push(...saqs);
      }

      if (options.laqCount > 0) {
        job.progress(80);
        logger.info(`Quiz ${quizId}: Generating ${options.laqCount} LAQs`);
        const laqs = await this.generateLAQs(pdfContent, options.laqCount, options.difficulty);
        allQuestions.push(...laqs);
      }

      if (allQuestions.length === 0) {
        throw new Error('No questions generated');
      }

      await Quiz.findByIdAndUpdate(
        quizId,
        {
          status: 'ready',
          questions: allQuestions,
          totalQuestions: allQuestions.length,
          totalPoints: allQuestions.reduce((sum: number, q: any) => sum + (q.points ? Number(q.points) : 1), 0)
        },
        { new: true }
      );

      job.progress(100);
      logger.info(`Quiz ${quizId}: Generation completed successfully with ${allQuestions.length} questions`);

      return { success: true, quizId, questionsGenerated: allQuestions.length };
    } catch (error) {
      logger.error(`Quiz ${quizId}: Generation failed`, error);
      await Quiz.findByIdAndUpdate(quizId, { status: 'failed', generationError: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  async fetchPDFContent(pdfId: string): Promise<string> {
    try {
      const pdf: any = await PDF.findById(pdfId);
      if (!pdf || pdf.status !== 'ready') {
        throw new Error('PDF not ready');
      }

      const chunks = await chromaHelper.getEmbeddingCount(pdfId);
      if (chunks === 0) {
        // Fallback: Use PDF text content if available
        if (pdf.textContent && pdf.textContent.length > 100) {
          logger.warn(`No embeddings found for PDF ${pdfId}, using text content as fallback`);
          return pdf.textContent;
        }
        throw new Error('No PDF content found in vector database');
      }

      const collection = await getCollection();
      if (!collection) {
        throw new Error('ChromaDB collection not initialized');
      }
      // Fetch more and sample to diversify
      const fetchLimit = Math.min(200, Math.max(50, chunks));
      const results = await collection.get({ where: { pdfId: pdfId.toString() }, limit: fetchLimit });
      const docs: string[] = results.documents || [];
      if (docs.length === 0) {
        // Fallback: Use PDF text content if available
        if (pdf.textContent && pdf.textContent.length > 100) {
          logger.warn(`No documents found in ChromaDB for PDF ${pdfId}, using text content as fallback`);
          return pdf.textContent;
        }
        throw new Error('No PDF content found in vector database');
      }
      
      // Randomly sample up to 50 unique indices
      const sampleSize = Math.min(50, docs.length);
      const indices = Array.from({ length: docs.length }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp: number = indices[i]!;
        indices[i] = indices[j]!;
        indices[j] = tmp;
      }
      const selected = indices.slice(0, sampleSize).map(i => docs[i]!);
      const content = selected.join('\n\n');
      logger.info(`Fetched ${docs.length} chunks, sampled ${sampleSize} for quiz generation`);
      return content;
    } catch (error) {
      logger.error('Failed to fetch PDF content:', error);
      throw error;
    }
  }

  async generateMCQs(content: string, count: number, difficulty: 'easy' | 'medium' | 'hard') {
    try {
      const prompt = buildMCQGenerationPrompt(content, count, difficulty);
      const response = await aiService.generateText(prompt);
      const questions = this.parseQuestionResponse(response, 'MCQ');
      return questions.slice(0, count).map((q: any) => ({ ...q, type: 'MCQ', points: 1 }));
    } catch (error) {
      logger.error('MCQ generation failed:', error);
      return [];
    }
  }

  async generateSAQs(content: string, count: number, difficulty: 'easy' | 'medium' | 'hard') {
    try {
      const prompt = buildSAQGenerationPrompt(content, count, difficulty);
      const response = await aiService.generateText(prompt);
      const questions = this.parseQuestionResponse(response, 'SAQ');
      return questions.slice(0, count).map((q: any) => ({ ...q, type: 'SAQ', options: [], points: 2 }));
    } catch (error) {
      logger.error('SAQ generation failed:', error);
      return [];
    }
  }

  async generateLAQs(content: string, count: number, difficulty: 'easy' | 'medium' | 'hard') {
    try {
      const prompt = buildLAQGenerationPrompt(content, count, difficulty);
      const response = await aiService.generateText(prompt);
      const questions = this.parseQuestionResponse(response, 'LAQ');
      return questions.slice(0, count).map((q: any) => ({ ...q, type: 'LAQ', options: [], points: 5 }));
    } catch (error) {
      logger.error('LAQ generation failed:', error);
      return [];
    }
  }

  parseQuestionResponse(response: string, questionType: 'MCQ' | 'SAQ' | 'LAQ') {
    try {
      // Try fenced array first
      let jsonText: string | null = null;
      const fenced = response.match(/```json[\s\S]*?```/i);
      if (fenced) {
        jsonText = fenced[0].replace(/```json/i, '').replace(/```/, '').trim();
      }
      if (!jsonText) {
        const arrayMatch = response.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          jsonText = arrayMatch[0];
        }
      }
      if (!jsonText) {
        logger.warn('No JSON array found in LLM response');
        return [];
      }
      const questions = JSON.parse(jsonText);
      return questions.filter((q: any) => {
        if (!q.question || !q.correctAnswer) {
          logger.warn('Invalid question format, skipping');
          return false;
        }
        if (questionType === 'MCQ') {
          if (!Array.isArray(q.options) || q.options.length < 4) {
            logger.warn('MCQ missing options, skipping');
            return false;
          }
        }
        return true;
      });
    } catch (error) {
      logger.error('Failed to parse question response:', error);
      return [];
    }
  }
}

export default new QuizGenerator();
