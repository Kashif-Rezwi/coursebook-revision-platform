import aiService from './aiService';
import { buildAnswerEvaluationPrompt } from '../utils/quizPrompts';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/apiError';

export interface EvaluationResult {
  isCorrect: boolean;
  pointsEarned: number;
  score: number;
  feedback: string;
  keyPointsCovered: string[];
  keyPointsMissed: string[];
}

class EvaluationService {
  evaluateMCQ(userAnswer: string, correctAnswer: string, points: number = 1): EvaluationResult {
    const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

    return {
      isCorrect,
      pointsEarned: isCorrect ? points : 0,
      score: isCorrect ? points : 0,
      feedback: isCorrect ? 'Correct answer!' : `Incorrect. The correct answer is: ${correctAnswer}`,
      keyPointsCovered: isCorrect ? ['Correct answer selected'] : [],
      keyPointsMissed: isCorrect ? [] : ['Incorrect answer selected']
    };
  }

  async evaluateSAQ(question: string, correctAnswer: string, userAnswer: string, points: number = 2): Promise<EvaluationResult> {
    try {
      const prompt = buildAnswerEvaluationPrompt(question, correctAnswer, userAnswer, points);
      const response = await aiService.generateText(prompt);
      const evaluation = this.parseEvaluationResponse(response);
      evaluation.score = Math.min(Math.max(evaluation.score, 0), points);
      evaluation.pointsEarned = evaluation.score;
      logger.info(`SAQ evaluated: ${evaluation.score}/${points} points`);
      return evaluation;
    } catch (error) {
      logger.error('SAQ evaluation failed:', error);
      return this.getDefaultEvaluationResult();
    }
  }

  async evaluateLAQ(question: string, correctAnswer: string, userAnswer: string, points: number = 5): Promise<EvaluationResult> {
    try {
      const prompt = buildAnswerEvaluationPrompt(question, correctAnswer, userAnswer, points);
      const response = await aiService.generateText(prompt);
      const evaluation = this.parseEvaluationResponse(response);
      evaluation.score = Math.min(Math.max(evaluation.score, 0), points);
      evaluation.pointsEarned = evaluation.score;
      logger.info(`LAQ evaluated: ${evaluation.score}/${points} points`);
      return evaluation;
    } catch (error) {
      logger.error('LAQ evaluation failed:', error);
      return this.getDefaultEvaluationResult();
    }
  }

  async evaluateAnswer(question: { type: 'MCQ' | 'SAQ' | 'LAQ'; question: string; correctAnswer: string; points: number }, userAnswer: string): Promise<EvaluationResult> {
    const { type, correctAnswer, points } = question;

    switch (type) {
      case 'MCQ':
        return this.evaluateMCQ(userAnswer, correctAnswer, points);
      case 'SAQ':
        return await this.evaluateSAQ(question.question, correctAnswer, userAnswer, points);
      case 'LAQ':
        return await this.evaluateLAQ(question.question, correctAnswer, userAnswer, points);
      default:
        throw ApiError.badRequest('Invalid question type', 'INVALID_QUESTION_TYPE');
    }
  }

  parseEvaluationResponse(response: string): EvaluationResult {
    try {
      const parsed = this.tryParseEvaluationJSON(response);
      if (parsed) {
        return parsed;
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      logger.error('Failed to parse evaluation response:', error);
      return {
        score: 0,
        isCorrect: false,
        pointsEarned: 0,
        feedback: 'Unable to parse evaluation response',
        keyPointsCovered: [],
        keyPointsMissed: []
      };
    }
  }

  private getDefaultEvaluationResult(): EvaluationResult {
    return {
      isCorrect: false,
      pointsEarned: 0,
      score: 0,
      feedback: 'Unable to evaluate answer automatically. Please review manually.',
      keyPointsCovered: [],
      keyPointsMissed: []
    };
  }

  private tryParseEvaluationJSON(text: string): EvaluationResult | null {
    // 1) Try fenced code block ```json ... ```
    const fenceMatch = text.match(/```json[\s\S]*?```/i);
    if (fenceMatch) {
      const inside = fenceMatch[0].replace(/```json/i, '').replace(/```/, '').trim();
      const obj = this.safeParseObject(inside);
      if (obj) return obj;
    }
    // 2) Try first JSON object
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const obj = this.safeParseObject(objMatch[0]);
      if (obj) return obj;
    }
    // 3) If text itself is a JSON object
    const direct = this.safeParseObject(text);
    if (direct) return direct;
    return null;
  }

  private safeParseObject(s: string): EvaluationResult | null {
    try {
      const parsed = JSON.parse(s);
      return {
        score: typeof parsed.score === 'number' ? parsed.score : 0,
        isCorrect: Boolean(parsed.isCorrect),
        pointsEarned: typeof parsed.score === 'number' ? parsed.score : 0,
        feedback: typeof parsed.feedback === 'string' ? parsed.feedback : 'No feedback provided',
        keyPointsCovered: Array.isArray(parsed.keyPointsCovered) ? parsed.keyPointsCovered : [],
        keyPointsMissed: Array.isArray(parsed.keyPointsMissed) ? parsed.keyPointsMissed : []
      };
    } catch {
      return null;
    }
  }
}

export default new EvaluationService();
