# Module 7: Quiz Generation & Evaluation Service - Low-Level Design (LLD)

---

## 1. Module Overview

**Purpose**: Implement AI-powered quiz generation from PDFs and intelligent evaluation of student answers using LLMs.

**Responsibilities**:
- Generate MCQs, SAQs, and LAQs from PDF content
- Structure quiz questions with options and correct answers
- Store quizzes with metadata (difficulty, topics, points)
- Handle quiz submission and answer collection
- Evaluate answers using LLM (especially for SAQ/LAQ)
- Calculate scores and provide detailed feedback
- Track quiz attempts with timestamps
- Update Progress model based on performance
- Replace quiz worker stub with real implementation

**Success Criteria**:
- Generate diverse questions from PDF content
- Questions are relevant and accurate
- MCQs have plausible distractors
- LLM evaluates SAQ/LAQ answers fairly
- Scores are calculated correctly
- Feedback is constructive and helpful
- Quiz attempts are properly tracked
- Progress is updated automatically

---

## 2. Directory Structure

```
backend/
├── src/
│   ├── services/
│   │   ├── quizService.js              # Quiz business logic
│   │   └── evaluationService.js        # Answer evaluation logic
│   │
│   ├── controllers/
│   │   └── quizController.js           # Quiz route handlers
│   │
│   ├── routes/
│   │   └── quizRoutes.js               # Quiz API routes
│   │
│   ├── utils/
│   │   ├── quizPrompts.js              # LLM prompts for generation
│   │   └── scoreCalculator.js          # Score calculation utilities
│   │
│   ├── validators/
│   │   └── quizValidator.js            # Quiz validation schemas
│   │
│   └── workers/
│       └── quizGenerator.js            # (Update existing stub)
```

---

## 3. Technology Stack for Module 7

**Dependencies**: Already installed
- `@huggingface/inference` - LLM for generation and evaluation (from Module 6)
- All other dependencies already available

**No new dependencies needed!**

---

## 4. Detailed Component Design

### **A. Quiz Prompts (`utils/quizPrompts.js`)**

**Purpose**: Centralize LLM prompts for quiz generation and evaluation

**Prompt Templates**:

1. **MCQ Generation Prompt**
```
Generate multiple-choice questions from the provided text.

Text:
{pdfContent}

Requirements:
- Generate {count} multiple-choice questions
- Each question should have 4 options (A, B, C, D)
- Only one option should be correct
- Include plausible distractors
- Questions should test understanding, not just recall
- Difficulty: {difficulty}

Return as JSON array with this structure:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option B",
    "explanation": "Explanation of why this is correct",
    "topic": "Main topic of the question",
    "difficulty": "medium"
  }
]
```

2. **SAQ Generation Prompt**
```
Generate short answer questions from the provided text.

Text:
{pdfContent}

Requirements:
- Generate {count} short answer questions
- Questions should require 2-4 sentence answers
- Test conceptual understanding
- Difficulty: {difficulty}

Return as JSON array with this structure:
[
  {
    "question": "Question text here?",
    "correctAnswer": "Expected answer in 2-4 sentences",
    "explanation": "Additional context or explanation",
    "topic": "Main topic of the question",
    "difficulty": "medium"
  }
]
```

3. **LAQ Generation Prompt**
```
Generate long answer questions from the provided text.

Text:
{pdfContent}

Requirements:
- Generate {count} long answer questions
- Questions should require detailed, multi-paragraph answers
- Test deep understanding and ability to explain concepts
- Difficulty: {difficulty}

Return as JSON array with this structure:
[
  {
    "question": "Question text here?",
    "correctAnswer": "Comprehensive answer with multiple points",
    "explanation": "Key points that should be covered",
    "topic": "Main topic of the question",
    "difficulty": "hard"
  }
]
```

4. **Answer Evaluation Prompt**
```
Evaluate the student's answer to the question.

Question: {question}
Correct Answer: {correctAnswer}
Student's Answer: {studentAnswer}

Evaluate based on:
1. Accuracy of information
2. Completeness of the answer
3. Understanding demonstrated
4. Relevance to the question

Provide:
1. Score (0-{maxPoints}): Based on correctness and completeness
2. Feedback: Constructive feedback on what was good and what could be improved
3. Key points covered: List which key points the student addressed
4. Key points missed: List what was missing

Return as JSON:
{
  "score": number,
  "isCorrect": boolean,
  "feedback": "Detailed feedback text",
  "keyPointsCovered": ["point1", "point2"],
  "keyPointsMissed": ["point3", "point4"]
}
```

**Implementation Pattern**:
```javascript
const buildMCQGenerationPrompt = (pdfContent, count, difficulty = 'medium') => {
  return `Generate multiple-choice questions from the provided text.

Text:
${pdfContent}

Requirements:
- Generate exactly ${count} multiple-choice questions
- Each question should have 4 options (A, B, C, D)
- Only one option should be correct
- Include plausible distractors (incorrect but believable options)
- Questions should test understanding, not just memorization
- Difficulty level: ${difficulty}
- Questions should be clear and unambiguous

Return ONLY a valid JSON array with this exact structure (no additional text):
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option B",
    "explanation": "Explanation of why this is correct",
    "topic": "Main topic of the question",
    "difficulty": "${difficulty}"
  }
]`;
};

const buildSAQGenerationPrompt = (pdfContent, count, difficulty = 'medium') => {
  return `Generate short answer questions from the provided text.

Text:
${pdfContent}

Requirements:
- Generate exactly ${count} short answer questions
- Questions should require 2-4 sentence answers
- Test conceptual understanding and application
- Difficulty level: ${difficulty}
- Questions should be specific and focused

Return ONLY a valid JSON array with this exact structure (no additional text):
[
  {
    "question": "Question text here?",
    "correctAnswer": "Expected answer in 2-4 sentences",
    "explanation": "Additional context or key points to cover",
    "topic": "Main topic of the question",
    "difficulty": "${difficulty}"
  }
]`;
};

const buildLAQGenerationPrompt = (pdfContent, count, difficulty = 'hard') => {
  return `Generate long answer questions from the provided text.

Text:
${pdfContent}

Requirements:
- Generate exactly ${count} long answer questions
- Questions should require detailed, multi-paragraph answers
- Test deep understanding and ability to explain complex concepts
- Difficulty level: ${difficulty}
- Questions should encourage critical thinking

Return ONLY a valid JSON array with this exact structure (no additional text):
[
  {
    "question": "Question text here?",
    "correctAnswer": "Comprehensive answer with multiple paragraphs covering key concepts",
    "explanation": "Key points that should be covered in a complete answer",
    "topic": "Main topic of the question",
    "difficulty": "${difficulty}"
  }
]`;
};

const buildAnswerEvaluationPrompt = (question, correctAnswer, studentAnswer, maxPoints) => {
  return `Evaluate the student's answer to the question.

Question: ${question}

Expected/Correct Answer:
${correctAnswer}

Student's Answer:
${studentAnswer}

Evaluate based on:
1. Accuracy of information provided
2. Completeness of the answer
3. Depth of understanding demonstrated
4. Relevance to the question asked

Maximum points possible: ${maxPoints}

Provide a fair and constructive evaluation. Return ONLY a valid JSON object with this exact structure (no additional text):
{
  "score": number (0 to ${maxPoints}),
  "isCorrect": boolean (true if score >= ${maxPoints * 0.6}),
  "feedback": "Detailed, constructive feedback explaining the score",
  "keyPointsCovered": ["key point 1 that was addressed", "key point 2 that was addressed"],
  "keyPointsMissed": ["key point that was missing or incorrect"]
}`;
};

module.exports = {
  buildMCQGenerationPrompt,
  buildSAQGenerationPrompt,
  buildLAQGenerationPrompt,
  buildAnswerEvaluationPrompt
};
```

---

### **B. Score Calculator (`utils/scoreCalculator.js`)**

**Purpose**: Calculate quiz scores and statistics

**Functions**:
1. **`calculateQuizScore(answers, questions)`** - Calculate total score
2. **`calculatePercentage(score, totalPoints)`** - Calculate percentage
3. **`determineGrade(percentage)`** - Assign letter grade
4. **`calculateTopicWiseScore(answers, questions)`** - Score by topic

**Implementation Pattern**:
```javascript
const calculateQuizScore = (answers, questions) => {
  let totalScore = 0;
  let totalPoints = 0;

  answers.forEach((answer, index) => {
    const question = questions[index];
    if (question) {
      totalPoints += question.points || 1;
      totalScore += answer.pointsEarned || 0;
    }
  });

  return {
    score: totalScore,
    totalPoints,
    percentage: calculatePercentage(totalScore, totalPoints)
  };
};

const calculatePercentage = (score, totalPoints) => {
  if (totalPoints === 0) return 0;
  return Math.round((score / totalPoints) * 100);
};

const determineGrade = (percentage) => {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
};

const calculateTopicWiseScore = (answers, questions) => {
  const topicScores = {};

  answers.forEach((answer, index) => {
    const question = questions[index];
    if (question && question.topic) {
      if (!topicScores[question.topic]) {
        topicScores[question.topic] = {
          topic: question.topic,
          totalQuestions: 0,
          correctAnswers: 0,
          totalPoints: 0,
          earnedPoints: 0
        };
      }

      topicScores[question.topic].totalQuestions++;
      topicScores[question.topic].totalPoints += question.points || 1;
      topicScores[question.topic].earnedPoints += answer.pointsEarned || 0;
      
      if (answer.isCorrect) {
        topicScores[question.topic].correctAnswers++;
      }
    }
  });

  // Calculate accuracy for each topic
  Object.keys(topicScores).forEach(topic => {
    const data = topicScores[topic];
    data.accuracy = calculatePercentage(data.correctAnswers, data.totalQuestions);
  });

  return Object.values(topicScores);
};

module.exports = {
  calculateQuizScore,
  calculatePercentage,
  determineGrade,
  calculateTopicWiseScore
};
```

---

### **C. Evaluation Service (`services/evaluationService.js`)**

**Purpose**: Evaluate student answers using LLM

**Functions**:
1. **`evaluateMCQ(userAnswer, correctAnswer, points)`** - Simple string comparison
2. **`evaluateSAQ(question, correctAnswer, userAnswer, points)`** - LLM evaluation
3. **`evaluateLAQ(question, correctAnswer, userAnswer, points)`** - LLM evaluation
4. **`evaluateAnswer(question, userAnswer)`** - Route to appropriate evaluator

**Implementation Pattern**:
```javascript
const llmService = require('./llmService');
const { buildAnswerEvaluationPrompt } = require('../utils/quizPrompts');
const logger = require('../utils/logger');
const ApiError = require('../utils/apiError');

class EvaluationService {
  evaluateMCQ(userAnswer, correctAnswer, points = 1) {
    const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    
    return {
      isCorrect,
      pointsEarned: isCorrect ? points : 0,
      feedback: isCorrect 
        ? 'Correct answer!' 
        : `Incorrect. The correct answer is: ${correctAnswer}`,
      keyPointsCovered: isCorrect ? ['Correct answer selected'] : [],
      keyPointsMissed: isCorrect ? [] : ['Incorrect answer selected']
    };
  }

  async evaluateSAQ(question, correctAnswer, userAnswer, points = 2) {
    try {
      // Build evaluation prompt
      const prompt = buildAnswerEvaluationPrompt(
        question,
        correctAnswer,
        userAnswer,
        points
      );

      // Get LLM evaluation
      const response = await llmService.generateResponse(prompt);

      // Parse JSON response
      const evaluation = this.parseEvaluationResponse(response);

      // Ensure score is within bounds
      evaluation.score = Math.min(Math.max(evaluation.score, 0), points);
      evaluation.pointsEarned = evaluation.score;

      logger.info(`SAQ evaluated: ${evaluation.score}/${points} points`);

      return evaluation;
    } catch (error) {
      logger.error('SAQ evaluation failed:', error);
      
      // Fallback evaluation
      return {
        isCorrect: false,
        pointsEarned: 0,
        score: 0,
        feedback: 'Unable to evaluate answer automatically. Please review manually.',
        keyPointsCovered: [],
        keyPointsMissed: []
      };
    }
  }

  async evaluateLAQ(question, correctAnswer, userAnswer, points = 5) {
    try {
      // Build evaluation prompt
      const prompt = buildAnswerEvaluationPrompt(
        question,
        correctAnswer,
        userAnswer,
        points
      );

      // Get LLM evaluation
      const response = await llmService.generateResponse(prompt);

      // Parse JSON response
      const evaluation = this.parseEvaluationResponse(response);

      // Ensure score is within bounds
      evaluation.score = Math.min(Math.max(evaluation.score, 0), points);
      evaluation.pointsEarned = evaluation.score;

      logger.info(`LAQ evaluated: ${evaluation.score}/${points} points`);

      return evaluation;
    } catch (error) {
      logger.error('LAQ evaluation failed:', error);
      
      // Fallback evaluation
      return {
        isCorrect: false,
        pointsEarned: 0,
        score: 0,
        feedback: 'Unable to evaluate answer automatically. Please review manually.',
        keyPointsCovered: [],
        keyPointsMissed: []
      };
    }
  }

  async evaluateAnswer(question, userAnswer) {
    const { type, correctAnswer, points } = question;

    switch (type) {
      case 'MCQ':
        return this.evaluateMCQ(userAnswer, correctAnswer, points);
      
      case 'SAQ':
        return await this.evaluateSAQ(
          question.question,
          correctAnswer,
          userAnswer,
          points
        );
      
      case 'LAQ':
        return await this.evaluateLAQ(
          question.question,
          correctAnswer,
          userAnswer,
          points
        );
      
      default:
        throw ApiError.badRequest('Invalid question type', 'INVALID_QUESTION_TYPE');
    }
  }

  parseEvaluationResponse(response) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        return {
          score: parsed.score || 0,
          isCorrect: parsed.isCorrect || false,
          pointsEarned: parsed.score || 0,
          feedback: parsed.feedback || 'No feedback provided',
          keyPointsCovered: parsed.keyPointsCovered || [],
          keyPointsMissed: parsed.keyPointsMissed || []
        };
      }
      
      throw new Error('No JSON found in response');
    } catch (error) {
      logger.error('Failed to parse evaluation response:', error);
      
      // Return safe default
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
}

module.exports = new EvaluationService();
```

---

### **D. Quiz Service (`services/quizService.js`)**

**Purpose**: Business logic for quiz management

**Functions**:
1. **`createQuiz(userId, pdfId, options)`** - Create quiz and trigger generation
2. **`getQuizById(quizId, userId)`** - Get quiz details
3. **`getUserQuizzes(userId, filters)`** - List user's quizzes
4. **`submitQuizAttempt(quizId, userId, answers, timeTaken)`** - Submit answers and evaluate
5. **`getQuizAttempts(quizId, userId)`** - Get user's attempts
6. **`deleteQuiz(quizId, userId)`** - Delete quiz

**Implementation Pattern**:
```javascript
const { Quiz, QuizAttempt, Progress } = require('../models');
const { addQuizGenerationJob } = require('../queues/quizGenerationQueue');
const evaluationService = require('./evaluationService');
const { calculateQuizScore, calculateTopicWiseScore } = require('../utils/scoreCalculator');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');

class QuizService {
  async createQuiz(userId, pdfId, options = {}) {
    try {
      const {
        title = 'New Quiz',
        mcqCount = 5,
        saqCount = 3,
        laqCount = 2,
        difficulty = 'medium'
      } = options;

      // Create quiz document
      const quiz = await Quiz.create({
        userId,
        pdfId,
        title,
        status: 'generating'
      });

      logger.info(`Quiz created: ${quiz._id} by user ${userId}`);

      // Add to generation queue
      const job = await addQuizGenerationJob({
        quizId: quiz._id.toString(),
        userId: userId.toString(),
        pdfId: pdfId.toString(),
        options: {
          mcqCount,
          saqCount,
          laqCount,
          difficulty
        }
      });

      logger.info(`Quiz generation job created: ${job.id} for quiz ${quiz._id}`);

      return {
        quiz,
        jobId: job.id
      };
    } catch (error) {
      logger.error('Quiz creation failed:', error);
      throw ApiError.internal('Failed to create quiz', 'QUIZ_CREATE_ERROR');
    }
  }

  async getQuizById(quizId, userId, includeAnswers = false) {
    try {
      const quiz = await Quiz.findOne({ _id: quizId, userId })
        .populate('pdfId', 'originalName pageCount status');

      if (!quiz) {
        throw ApiError.notFound('Quiz not found', 'QUIZ_NOT_FOUND');
      }

      // Remove correct answers if not requested (for taking quiz)
      if (!includeAnswers && quiz.status === 'ready') {
        quiz.questions = quiz.questions.map(q => {
          const { correctAnswer, ...questionWithoutAnswer } = q.toObject();
          return questionWithoutAnswer;
        });
      }

      return quiz;
    } catch (error) {
      if (error.name === 'CastError') {
        throw ApiError.badRequest('Invalid quiz ID', 'INVALID_QUIZ_ID');
      }
      throw error;
    }
  }

  async getUserQuizzes(userId, filters = {}) {
    try {
      const { pdfId, status, limit = 50, skip = 0, sortBy = '-createdAt' } = filters;

      const query = { userId };
      
      if (pdfId) {
        query.pdfId = pdfId;
      }
      
      if (status) {
        query.status = status;
      }

      const quizzes = await Quiz.find(query)
        .sort(sortBy)
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .select('-questions') // Don't include questions in list view
        .populate('pdfId', 'originalName pageCount status');

      const total = await Quiz.countDocuments(query);

      return {
        quizzes,
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      };
    } catch (error) {
      logger.error('Failed to get user quizzes:', error);
      throw ApiError.internal('Failed to retrieve quizzes', 'QUIZ_RETRIEVAL_ERROR');
    }
  }

  async submitQuizAttempt(quizId, userId, answers, timeTaken = null) {
    try {
      // Get quiz with correct answers
      const quiz = await this.getQuizById(quizId, userId, true);

      if (quiz.status !== 'ready') {
        throw ApiError.badRequest('Quiz is not ready', 'QUIZ_NOT_READY');
      }

      // Validate answers count
      if (answers.length !== quiz.questions.length) {
        throw ApiError.badRequest(
          'Answer count does not match question count',
          'INVALID_ANSWER_COUNT'
        );
      }

      logger.info(`Evaluating quiz attempt for quiz ${quizId}`);

      // Evaluate each answer
      const evaluatedAnswers = [];
      for (let i = 0; i < quiz.questions.length; i++) {
        const question = quiz.questions[i];
        const userAnswer = answers[i];

        const evaluation = await evaluationService.evaluateAnswer(question, userAnswer);

        evaluatedAnswers.push({
          questionId: question._id,
          userAnswer,
          isCorrect: evaluation.isCorrect,
          pointsEarned: evaluation.pointsEarned,
          feedback: evaluation.feedback
        });
      }

      // Calculate total score
      const scoreData = calculateQuizScore(evaluatedAnswers, quiz.questions);

      // Create quiz attempt
      const attempt = await QuizAttempt.create({
        userId,
        quizId,
        answers: evaluatedAnswers,
        score: scoreData.score,
        totalPoints: scoreData.totalPoints,
        percentage: scoreData.percentage,
        timeTaken
      });

      logger.info(`Quiz attempt created: ${attempt._id} - Score: ${scoreData.score}/${scoreData.totalPoints}`);

      // Update user progress
      await this.updateUserProgress(userId, attempt, quiz);

      return attempt;
    } catch (error) {
      logger.error('Quiz submission failed:', error);
      throw error;
    }
  }

  async updateUserProgress(userId, attempt, quiz) {
    try {
      let progress = await Progress.findOne({ userId });

      if (!progress) {
        progress = await Progress.create({ userId });
      }

      await progress.updateAfterQuiz(attempt, quiz);

      logger.info(`Progress updated for user ${userId}`);
    } catch (error) {
      logger.error('Progress update failed:', error);
      // Don't throw - progress update failure shouldn't fail the submission
    }
  }

  async getQuizAttempts(quizId, userId) {
    try {
      const attempts = await QuizAttempt.find({ quizId, userId })
        .sort('-completedAt')
        .select('-answers'); // Don't include full answers in list

      return attempts;
    } catch (error) {
      logger.error('Failed to get quiz attempts:', error);
      throw ApiError.internal('Failed to retrieve attempts', 'ATTEMPT_RETRIEVAL_ERROR');
    }
  }

  async deleteQuiz(quizId, userId) {
    try {
      const quiz = await Quiz.findOneAndDelete({ _id: quizId, userId });

      if (!quiz) {
        throw ApiError.notFound('Quiz not found', 'QUIZ_NOT_FOUND');
      }

      // Also delete all attempts for this quiz
      await QuizAttempt.deleteMany({ quizId });

      logger.info(`Quiz deleted: ${quizId} by user ${userId}`);

      return {
        message: 'Quiz deleted successfully',
        quizId
      };
    } catch (error) {
      logger.error('Quiz deletion failed:', error);
      throw error;
    }
  }
}

module.exports = new QuizService();
```

---

### **E. Update Quiz Generator Worker (`workers/quizGenerator.js`)**

**Purpose**: Replace stub with real quiz generation

**Flow**:
1. Fetch PDF content from ChromaDB
2. Generate MCQs using LLM
3. Generate SAQs using LLM
4. Generate LAQs using LLM
5. Parse and validate generated questions
6. Update quiz with questions
7. Update status to 'ready'

**Implementation Pattern**:
```javascript
const { Quiz, PDF } = require('../models');
const chromaHelper = require('../utils/chromaHelper');
const llmService = require('../services/llmService');
const {
  buildMCQGenerationPrompt,
  buildSAQGenerationPrompt,
  buildLAQGenerationPrompt
} = require('../utils/quizPrompts');
const logger = require('../utils/logger');

class QuizGenerator {
  async generateQuiz(job) {
    const { quizId, userId, pdfId, options } = job.data;

    try {
      // Update quiz status to generating
      await Quiz.findByIdAndUpdate(quizId, {
        status: 'generating',
        generationError: null
      });

      job.progress(10);
      logger.info(`Quiz ${quizId}: Status updated to generating`);

      // Step 1: Fetch PDF content
      job.progress(20);
      logger.info(`Quiz ${quizId}: Fetching PDF content`);
      const pdfContent = await this.fetchPDFContent(pdfId);

      if (!pdfContent || pdfContent.length < 100) {
        throw new Error('Insufficient PDF content for quiz generation');
      }

      const allQuestions = [];

      // Step 2: Generate MCQs
      if (options.mcqCount > 0) {
        job.progress(30);
        logger.info(`Quiz ${quizId}: Generating ${options.mcqCount} MCQs`);
        const mcqs = await this.generateMCQs(pdfContent, options.mcqCount, options.difficulty);
        allQuestions.push(...mcqs);
      }

      // Step 3: Generate SAQs
      if (options.saqCount > 0) {
        job.progress(60);
        logger.info(`Quiz ${quizId}: Generating ${options.saqCount} SAQs`);
        const saqs = await this.generateSAQs(pdfContent, options.saqCount, options.difficulty);
        allQuestions.push(...saqs);
      }

      // Step 4: Generate LAQs
      if (options.laqCount > 0) {
        job.progress(80);
        logger.info(`Quiz ${quizId}: Generating ${options.laqCount} LAQs`);
        const laqs = await this.generateLAQs(pdfContent, options.laqCount, options.difficulty);
        allQuestions.push(...laqs);
      }

      if (allQuestions.length === 0) {
        throw new Error('No questions generated');
      }

      // Step 5: Update quiz with questions
      const updatedQuiz = await Quiz.findByIdAndUpdate(
        quizId,
        {
          status: 'ready',
          questions: allQuestions,
          totalQuestions: allQuestions.length,
          totalPoints: allQuestions.reduce((sum, q) => sum + q.points, 0)
        },
        { new: true }
      );

      job.progress(100);
      logger.info(`Quiz ${quizId}: Generation completed successfully with ${allQuestions.length} questions`);

      return {
        success: true,
        quizId,
        questionsGenerated: allQuestions.length
      };

    } catch (error) {
      logger.error(`Quiz ${quizId}: Generation failed`, error);

      // Update quiz status to failed
      await Quiz.findByIdAndUpdate(quizId, {
        status: 'failed',
        generationError: error.message
      });

      throw error;
    }
  }

  async fetchPDFContent(pdfId) {
    try {
      // Get PDF document
      const pdf = await PDF.findById(pdfId);
      
      if (!pdf || pdf.status !== 'ready') {
        throw new Error('PDF not ready');
      }

      // Fetch all chunks for this PDF from ChromaDB
      const chunks = await chromaHelper.getEmbeddingCount(pdfId);
      
      if (chunks === 0) {
        throw new Error('No PDF content found in vector database');
      }

      // Get actual chunk content
      // For quiz generation, we'll fetch a sample of chunks
      const collection = await require('../config/chromadb').getCollection();
      const results = await collection.get({
        where: { pdfId: pdfId.toString() },
        limit: 50 // Get first 50 chunks for quiz generation
      });

      // Combine chunk texts
      const content = results.documents.join('\n\n');
      
      logger.info(`Fetched ${results.documents.length} chunks for quiz generation`);
      
      return content;
    } catch (error) {
      logger.error('Failed to fetch PDF content:', error);
      throw error;
    }
  }

  async generateMCQs(content, count, difficulty) {
    try {
      const prompt = buildMCQGenerationPrompt(content, count, difficulty);
      const response = await llmService.generateResponse(prompt);

      const questions = this.parseQuestionResponse(response, 'MCQ');
      
      // Ensure each MCQ has required fields and assign points
      return questions.slice(0, count).map(q => ({
        ...q,
        type: 'MCQ',
        points: 1
      }));
    } catch (error) {
      logger.error('MCQ generation failed:', error);
      return [];
    }
  }

  async generateSAQs(content, count, difficulty) {
    try {
      const prompt = buildSAQGenerationPrompt(content, count, difficulty);
      const response = await llmService.generateResponse(prompt);

      const questions = this.parseQuestionResponse(response, 'SAQ');
      
      // Ensure each SAQ has required fields and assign points
      return questions.slice(0, count).map(q => ({
        ...q,
        type: 'SAQ',
        options: [], // SAQs don't have options
        points: 2
      }));
    } catch (error) {
      logger.error('SAQ generation failed:', error);
      return [];
    }
  }

  async generateLAQs(content, count, difficulty) {
    try {
      const prompt = buildLAQGenerationPrompt(content, count, difficulty);
      const response = await llmService.generateResponse(prompt);

      const questions = this.parseQuestionResponse(response, 'LAQ');
      
      // Ensure each LAQ has required fields and assign points
      return questions.slice(0, count).map(q => ({
        ...q,
        type: 'LAQ',
        options: [], // LAQs don't have options
        points: 5
      }));
    } catch (error) {
      logger.error('LAQ generation failed:', error);
      return [];
    }
  }

  parseQuestionResponse(response, questionType) {
    try {
      // Try to extract JSON array from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      
      if (!jsonMatch) {
        logger.warn('No JSON array found in LLM response');
        return [];
      }

      const questions = JSON.parse(jsonMatch[0]);

      // Validate and sanitize questions
      return questions.filter(q => {
        if (!q.question || !q.correctAnswer) {
          logger.warn('Invalid question format, skipping');
          return false;
        }

        // For MCQs, validate options
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

module.exports = new QuizGenerator();
```

---

### **F. Quiz Validator (`validators/quizValidator.js`)**

**Purpose**: Joi validation schemas for quiz operations

**Schemas**:
1. **`createQuizSchema`** - Validate quiz creation
2. **`submitQuizSchema`** - Validate quiz submission
3. **`getQuizzesSchema`** - Validate list parameters
4. **`quizIdSchema`** - Validate quiz ID

**Implementation Pattern**:
```javascript
const Joi = require('joi');

const createQuizSchema = Joi.object({
  body: Joi.object({
    pdfId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid PDF ID format',
      'any.required': 'PDF ID is required'
    }),
    title: Joi.string().trim().max(200).default('New Quiz'),
    mcqCount: Joi.number().integer().min(0).max(20).default(5),
    saqCount: Joi.number().integer().min(0).max(10).default(3),
    laqCount: Joi.number().integer().min(0).max(5).default(2),
    difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium')
  })
});

const submitQuizSchema = Joi.object({
  body: Joi.object({
    answers: Joi.array().items(
      Joi.string().required()
    ).required().min(1).messages({
      'any.required': 'Answers are required',
      'array.min': 'At least one answer is required'
    }),
    timeTaken: Joi.number().integer().min(0).optional()
  }),
  params: Joi.object({
    quizId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  })
});

const getQuizzesSchema = Joi.object({
  query: Joi.object({
    pdfId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    status: Joi.string().valid('generating', 'ready', 'failed').optional(),
    limit: Joi.number().integer().min(1).max(100).default(50),
    skip: Joi.number().integer().min(0).default(0),
    sortBy: Joi.string().valid('createdAt', '-createdAt', 'title', '-title').default('-createdAt')
  })
});

const quizIdSchema = Joi.object({
  params: Joi.object({
    quizId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid quiz ID format'
    })
  })
});

module.exports = {
  createQuizSchema,
  submitQuizSchema,
  getQuizzesSchema,
  quizIdSchema
};
```

---

### **G. Quiz Controller (`controllers/quizController.js`)**

**Purpose**: Handle HTTP requests for quiz operations

**Functions**:
1. **`createQuiz(req, res)`** - Create new quiz
2. **`getUserQuizzes(req, res)`** - List user's quizzes
3. **`getQuiz(req, res)`** - Get quiz details
4. **`submitQuiz(req, res)`** - Submit quiz answers
5. **`getQuizAttempts(req, res)`** - Get quiz attempts
6. **`deleteQuiz(req, res)`** - Delete quiz

**Implementation Pattern**:
```javascript
const quizService = require('../services/quizService');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');

class QuizController {
  createQuiz = asyncHandler(async (req, res) => {
    const { pdfId, title, mcqCount, saqCount, laqCount, difficulty } = req.body;

    const result = await quizService.createQuiz(req.user.userId, pdfId, {
      title,
      mcqCount,
      saqCount,
      laqCount,
      difficulty
    });

    return successResponse(
      res,
      201,
      'Quiz created and generation started',
      result
    );
  });

  getUserQuizzes = asyncHandler(async (req, res) => {
    const filters = {
      pdfId: req.query.pdfId,
      status: req.query.status,
      limit: req.query.limit,
      skip: req.query.skip,
      sortBy: req.query.sortBy
    };

    const result = await quizService.getUserQuizzes(req.user.userId, filters);

    return successResponse(
      res,
      200,
      'Quizzes retrieved successfully',
      result
    );
  });

  getQuiz = asyncHandler(async (req, res) => {
    // Don't include answers when getting quiz for taking
    const quiz = await quizService.getQuizById(req.params.quizId, req.user.userId, false);

    return successResponse(
      res,
      200,
      'Quiz retrieved successfully',
      { quiz }
    );
  });

  submitQuiz = asyncHandler(async (req, res) => {
    const { answers, timeTaken } = req.body;

    const attempt = await quizService.submitQuizAttempt(
      req.params.quizId,
      req.user.userId,
      answers,
      timeTaken
    );

    return successResponse(
      res,
      200,
      'Quiz submitted successfully',
      { attempt }
    );
  });

  getQuizAttempts = asyncHandler(async (req, res) => {
    const attempts = await quizService.getQuizAttempts(
      req.params.quizId,
      req.user.userId
    );

    return successResponse(
      res,
      200,
      'Quiz attempts retrieved successfully',
      { attempts }
    );
  });

  deleteQuiz = asyncHandler(async (req, res) => {
    const result = await quizService.deleteQuiz(req.params.quizId, req.user.userId);

    return successResponse(
      res,
      200,
      'Quiz deleted successfully',
      result
    );
  });
}

module.exports = new QuizController();
```

---

### **H. Quiz Routes (`routes/quizRoutes.js`)**

**Purpose**: Define quiz API endpoints

**Routes**:

| Method | Endpoint | Middleware | Controller | Description |
|--------|----------|------------|------------|-------------|
| POST | `/quizzes` | authenticate, validate | quizController.createQuiz | Create quiz |
| GET | `/quizzes` | authenticate, validate | quizController.getUserQuizzes | List quizzes |
| GET | `/quizzes/:quizId` | authenticate, validate | quizController.getQuiz | Get quiz |
| POST | `/quizzes/:quizId/submit` | authenticate, validate | quizController.submitQuiz | Submit quiz |
| GET | `/quizzes/:quizId/attempts` | authenticate, validate | quizController.getQuizAttempts | Get attempts |
| DELETE | `/quizzes/:quizId` | authenticate, validate | quizController.deleteQuiz | Delete quiz |

**Implementation Pattern**:
```javascript
const express = require('express');
const quizController = require('../controllers/quizController');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/requestValidator');
const {
  createQuizSchema,
  submitQuizSchema,
  getQuizzesSchema,
  quizIdSchema
} = require('../validators/quizValidator');

const router = express.Router();

// All quiz routes require authentication
router.use(authenticate);

// Quiz management
router.post('/quizzes', validate(createQuizSchema), quizController.createQuiz);
router.get('/quizzes', validate(getQuizzesSchema), quizController.getUserQuizzes);
router.get('/quizzes/:quizId', validate(quizIdSchema), quizController.getQuiz);
router.delete('/quizzes/:quizId', validate(quizIdSchema), quizController.deleteQuiz);

// Quiz taking
router.post('/quizzes/:quizId/submit', validate(submitQuizSchema), quizController.submitQuiz);
router.get('/quizzes/:quizId/attempts', validate(quizIdSchema), quizController.getQuizAttempts);

module.exports = router;
```

---

### **I. Update App.js to Include Quiz Routes**

**Add to `src/app.js`** (after chat routes):

```javascript
const quizRoutes = require('./routes/quizRoutes');

app.use('/api', quizRoutes);
```

---

## 5. Quiz Generation Flow

```
User: Create Quiz (5 MCQs, 3 SAQs, 2 LAQs)
    ↓
1. Create Quiz document (status: 'generating')
    ↓
2. Add job to quiz generation queue
    ↓
3. Worker: Fetch PDF content from ChromaDB (50 chunks)
    ↓
4. Worker: Generate MCQs using LLM
   - Build MCQ prompt with PDF content
   - Call Hugging Face API
   - Parse JSON response
   - Validate questions
    ↓
5. Worker: Generate SAQs using LLM
    ↓
6. Worker: Generate LAQs using LLM
    ↓
7. Worker: Combine all questions
    ↓
8. Worker: Update Quiz document (status: 'ready')
    ↓
9. User retrieves quiz and sees questions (without answers)
```

---

## 6. Quiz Submission Flow

```
User: Submit Quiz Answers
    ↓
1. Fetch quiz with correct answers
    ↓
2. Validate answer count matches question count
    ↓
3. For each question:
   - If MCQ: Compare strings (exact match)
   - If SAQ: Call LLM evaluation service
   - If LAQ: Call LLM evaluation service
    ↓
4. LLM Evaluation:
   - Build evaluation prompt
   - Call Hugging Face API
   - Parse JSON response (score, feedback, key points)
   - Assign points based on score
    ↓
5. Calculate total score and percentage
    ↓
6. Create QuizAttempt document
    ↓
7. Update user Progress:
   - Increment quiz count
   - Update topic-wise performance
   - Recalculate weak/strong topics
   - Add to recent activity
    ↓
8. Return attempt with scores and feedback
```

---

## 7. API Request/Response Examples

### **Create Quiz**
```bash
POST /api/quizzes
Authorization: Bearer <token>
Content-Type: application/json

{
  "pdfId": "507f1f77bcf86cd799439011",
  "title": "Physics Chapter 1 Quiz",
  "mcqCount": 5,
  "saqCount": 3,
  "laqCount": 2,
  "difficulty": "medium"
}
```

**Response (201)**:
```json
{
  "success": true,
  "message": "Quiz created and generation started",
  "data": {
    "quiz": {
      "_id": "507f1f77bcf86cd799439030",
      "userId": "507f1f77bcf86cd799439013",
      "pdfId": "507f1f77bcf86cd799439011",
      "title": "Physics Chapter 1 Quiz",
      "status": "generating",
      "createdAt": "2025-10-07T12:00:00.000Z"
    },
    "jobId": "5"
  },
  "timestamp": "2025-10-07T12:00:00.000Z"
}
```

### **Get Quiz (for taking)**
```bash
GET /api/quizzes/507f1f77bcf86cd799439030
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Quiz retrieved successfully",
  "data": {
    "quiz": {
      "_id": "507f1f77bcf86cd799439030",
      "title": "Physics Chapter 1 Quiz",
      "pdfId": {
        "_id": "507f1f77bcf86cd799439011",
        "originalName": "Physics Chapter 1.pdf",
        "pageCount": 15,
        "status": "ready"
      },
      "status": "ready",
      "totalQuestions": 10,
      "totalPoints": 21,
      "questions": [
        {
          "_id": "507f1f77bcf86cd799439031",
          "type": "MCQ",
          "question": "What is Newton's first law of motion?",
          "options": [
            "An object at rest stays at rest",
            "Force equals mass times acceleration",
            "Every action has an equal reaction",
            "Energy is conserved"
          ],
          "topic": "Newton's Laws",
          "difficulty": "medium",
          "points": 1
        },
        {
          "_id": "507f1f77bcf86cd799439032",
          "type": "SAQ",
          "question": "Explain the concept of inertia.",
          "topic": "Newton's Laws",
          "difficulty": "medium",
          "points": 2
        }
      ]
    }
  }
}
```

Note: `correctAnswer` and `explanation` are not included when getting quiz for taking.

### **Submit Quiz**
```bash
POST /api/quizzes/507f1f77bcf86cd799439030/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "answers": [
    "An object at rest stays at rest",
    "Inertia is the tendency of an object to resist changes in its state of motion. Objects at rest stay at rest and objects in motion continue in motion unless acted upon by an external force.",
    "Newton's second law states that force equals mass times acceleration (F=ma). This means that the acceleration of an object is directly proportional to the net force acting on it and inversely proportional to its mass. A larger force produces greater acceleration, while a larger mass produces less acceleration for the same force. This law is fundamental in understanding how forces affect motion."
  ],
  "timeTaken": 600
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Quiz submitted successfully",
  "data": {
    "attempt": {
      "_id": "507f1f77bcf86cd799439040",
      "userId": "507f1f77bcf86cd799439013",
      "quizId": "507f1f77bcf86cd799439030",
      "answers": [
        {
          "questionId": "507f1f77bcf86cd799439031",
          "userAnswer": "An object at rest stays at rest",
          "isCorrect": true,
          "pointsEarned": 1,
          "feedback": "Correct answer!"
        },
        {
          "questionId": "507f1f77bcf86cd799439032",
          "userAnswer": "Inertia is the tendency...",
          "isCorrect": true,
          "pointsEarned": 2,
          "feedback": "Excellent answer! You correctly explained inertia and included the key concept of resistance to changes in motion. You also mentioned both aspects of Newton's first law."
        },
        {
          "questionId": "507f1f77bcf86cd799439033",
          "userAnswer": "Newton's second law states...",
          "isCorrect": true,
          "pointsEarned": 5,
          "feedback": "Outstanding! You provided a comprehensive explanation including the formula, the relationships between force, mass, and acceleration, and practical implications. Well done!"
        }
      ],
      "score": 8,
      "totalPoints": 8,
      "percentage": 100,
      "timeTaken": 600,
      "completedAt": "2025-10-07T12:10:00.000Z"
    }
  },
  "timestamp": "2025-10-07T12:10:00.000Z"
}
```

### **List User's Quizzes**
```bash
GET /api/quizzes?status=ready&limit=10
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Quizzes retrieved successfully",
  "data": {
    "quizzes": [
      {
        "_id": "507f1f77bcf86cd799439030",
        "userId": "507f1f77bcf86cd799439013",
        "title": "Physics Chapter 1 Quiz",
        "pdfId": {
          "_id": "507f1f77bcf86cd799439011",
          "originalName": "Physics Chapter 1.pdf",
          "pageCount": 15,
          "status": "ready"
        },
        "status": "ready",
        "totalQuestions": 10,
        "totalPoints": 21,
        "createdAt": "2025-10-07T12:00:00.000Z",
        "updatedAt": "2025-10-07T12:02:00.000Z"
      }
    ],
    "total": 1,
    "limit": 10,
    "skip": 0
  },
  "timestamp": "2025-10-07T12:15:00.000Z"
}
```

### **Get Quiz Attempts**
```bash
GET /api/quizzes/507f1f77bcf86cd799439030/attempts
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Quiz attempts retrieved successfully",
  "data": {
    "attempts": [
      {
        "_id": "507f1f77bcf86cd799439040",
        "userId": "507f1f77bcf86cd799439013",
        "quizId": "507f1f77bcf86cd799439030",
        "score": 8,
        "totalPoints": 8,
        "percentage": 100,
        "timeTaken": 600,
        "completedAt": "2025-10-07T12:10:00.000Z"
      }
    ]
  },
  "timestamp": "2025-10-07T12:20:00.000Z"
}
```

### **Delete Quiz**
```bash
DELETE /api/quizzes/507f1f77bcf86cd799439030
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Quiz deleted successfully",
  "data": {
    "message": "Quiz deleted successfully",
    "quizId": "507f1f77bcf86cd799439030"
  },
  "timestamp": "2025-10-07T12:25:00.000Z"
}
```

---

## 8. Testing Checklist

After implementation:

- [ ] Can create quiz with custom parameters
- [ ] Quiz generation job is triggered
- [ ] Worker fetches PDF content from ChromaDB
- [ ] LLM generates MCQs correctly
- [ ] LLM generates SAQs correctly
- [ ] LLM generates LAQs correctly
- [ ] Generated questions are valid JSON
- [ ] Quiz status updates to 'ready'
- [ ] Can retrieve quiz without answers
- [ ] Can submit quiz with answers
- [ ] MCQ evaluation works (string comparison)
- [ ] SAQ evaluation works (LLM-based)
- [ ] LAQ evaluation works (LLM-based)
- [ ] Scores are calculated correctly
- [ ] Feedback is provided for each answer
- [ ] QuizAttempt is created
- [ ] Progress is updated after submission
- [ ] Can list user's quizzes
- [ ] Can get quiz attempts history
- [ ] Can delete quiz

---
