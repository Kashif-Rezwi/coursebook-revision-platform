import Queue from 'bull';
import { Quiz } from '../models';
import { IQuestion } from '../models/Quiz';
import logger from '../utils/logger';
import { QUEUE_CONSTANTS } from '../utils/jobHelper';

class QuizGenerator {
  async generateQuiz(job: Queue.Job) {
    const { quizId, userId: _userId, pdfId: _pdfId, options } = job.data;

    try {
      // Update quiz status to generating
      await Quiz.findByIdAndUpdate(quizId, {
        status: 'generating',
        generationError: null
      });

      job.progress(10);
      logger.info(`Quiz ${quizId}: Status updated to generating`);

      // Simulate LLM calls (will be implemented in Module 7)
      await this.simulateGeneration(job, 'Fetching PDF content', 30);
      await this.simulateGeneration(job, 'Generating MCQs', 50);
      await this.simulateGeneration(job, 'Generating SAQs', 70);
      await this.simulateGeneration(job, 'Generating LAQs', 90);

      // Mock generated questions
      const mockQuestions = this.generateMockQuestions(options);

      // Update quiz with questions
      await Quiz.findByIdAndUpdate(
        quizId,
        {
          status: 'ready',
          questions: mockQuestions,
          totalQuestions: mockQuestions.length,
          totalPoints: mockQuestions.reduce((sum, q) => sum + q.points, 0)
        },
        { new: true }
      );

      job.progress(100);
      logger.info(`Quiz ${quizId}: Generation completed successfully`);

      return {
        success: true,
        quizId,
        questionsGenerated: mockQuestions.length
      };

    } catch (error) {
      logger.error(`Quiz ${quizId}: Generation failed`, error);

      // Update quiz status to failed
      await Quiz.findByIdAndUpdate(quizId, {
        status: 'failed',
        generationError: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  async simulateGeneration(job: Queue.Job, stepName: string, progressPercent: number) {
    logger.info(`Quiz ${job.data.quizId}: ${stepName}`);
    await new Promise(resolve => setTimeout(resolve, QUEUE_CONSTANTS.SIMULATION_DELAYS.QUIZ_GENERATION));
    job.progress(progressPercent);
  }

  generateMockQuestions(options: {
    mcqCount?: number;
    saqCount?: number;
    laqCount?: number;
    difficulty?: string;
  }): IQuestion[] {
    const questions: IQuestion[] = [];
    const { mcqCount = 5, saqCount = 3, laqCount = 2 } = options;

    // Mock MCQs
    for (let i = 0; i < mcqCount; i++) {
      questions.push({
        type: 'MCQ',
        question: `Mock MCQ Question ${i + 1}: What is the fundamental principle discussed in this chapter?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'Option A',
        explanation: 'This is a mock explanation for the correct answer.',
        topic: 'Physics',
        difficulty: 'medium',
        points: 1
      });
    }

    // Mock SAQs
    for (let i = 0; i < saqCount; i++) {
      questions.push({
        type: 'SAQ',
        question: `Mock SAQ Question ${i + 1}: Briefly explain the concept discussed in the chapter.`,
        options: [],
        correctAnswer: 'Mock short answer explaining the concept briefly.',
        explanation: 'This is a mock explanation for the short answer.',
        topic: 'Physics',
        difficulty: 'medium',
        points: 2
      });
    }

    // Mock LAQs
    for (let i = 0; i < laqCount; i++) {
      questions.push({
        type: 'LAQ',
        question: `Mock LAQ Question ${i + 1}: Provide a detailed explanation with examples.`,
        options: [],
        correctAnswer: 'Mock long answer with detailed explanation including examples, derivations, and applications.',
        explanation: 'This is a mock explanation for the long answer question.',
        topic: 'Physics',
        difficulty: 'hard',
        points: 5
      });
    }

    return questions;
  }
}

export default new QuizGenerator();
