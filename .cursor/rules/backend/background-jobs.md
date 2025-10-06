# Module 4: Background Job Queue - Low-Level Design (LLD)

---

## 1. Module Overview

**Purpose**: Implement asynchronous task processing infrastructure for long-running operations like PDF processing and quiz generation.

**Responsibilities**:
- Set up Bull queue with Redis connection
- Define job processors for PDF and quiz operations
- Implement job status tracking
- Handle job retries and failures
- Provide job monitoring utilities
- Create queue management endpoints

**Success Criteria**:
- Bull queue connects to Redis successfully
- Jobs can be added to queue and processed asynchronously
- Job status can be queried (pending, processing, completed, failed)
- Failed jobs retry automatically with exponential backoff
- Job processors log progress and errors
- Queue health can be monitored

---

## 2. Directory Structure

```
backend/
├── src/
│   ├── config/
│   │   └── queue.js                    # Bull queue configuration
│   │
│   ├── queues/
│   │   ├── pdfProcessingQueue.js       # PDF processing queue
│   │   └── quizGenerationQueue.js      # Quiz generation queue
│   │
│   ├── workers/
│   │   ├── pdfProcessor.js             # PDF processing worker
│   │   └── quizGenerator.js            # Quiz generation worker
│   │
│   ├── services/
│   │   └── jobService.js               # Job status and management
│   │
│   ├── controllers/
│   │   └── jobController.js            # Job status endpoints
│   │
│   ├── routes/
│   │   └── jobRoutes.js                # Job management routes
│   │
│   └── utils/
│       └── jobHelper.js                # Job utility functions
```

---

## 3. Technology Stack for Module 4

**New Dependencies**:
```json
{
  "bull": "^4.12.0",
  "ioredis": "^5.3.2"
}
```

---

## 4. Detailed Component Design

### **A. Queue Configuration (`config/queue.js`)**

**Purpose**: Configure Bull queues with Redis connection

**Configuration Options**:
```javascript
{
  redis: {
    host: config.redisHost,
    port: config.redisPort,
    password: config.redisPassword,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 100,  // Keep last 100 completed jobs
    removeOnFail: 500       // Keep last 500 failed jobs
  }
}
```

**Features**:
- Shared Redis connection
- Default retry strategy
- Job cleanup policies
- Connection error handling

**Implementation Pattern**:
```javascript
const Queue = require('bull');
const config = require('./env');
const logger = require('../utils/logger');

const redisConfig = {
  redis: {
    host: config.redisHost || 'localhost',
    port: config.redisPort || 6379,
    password: config.redisPassword || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  }
};

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  },
  removeOnComplete: 100,
  removeOnFail: 500
};

const createQueue = (queueName) => {
  const queue = new Queue(queueName, redisConfig);

  // Event listeners
  queue.on('error', (error) => {
    logger.error(`Queue ${queueName} error:`, error);
  });

  queue.on('waiting', (jobId) => {
    logger.debug(`Job ${jobId} waiting in ${queueName}`);
  });

  queue.on('active', (job) => {
    logger.info(`Job ${job.id} started in ${queueName}`);
  });

  queue.on('completed', (job) => {
    logger.info(`Job ${job.id} completed in ${queueName}`);
  });

  queue.on('failed', (job, err) => {
    logger.error(`Job ${job.id} failed in ${queueName}:`, err);
  });

  return queue;
};

module.exports = {
  createQueue,
  redisConfig,
  defaultJobOptions
};
```

---

### **B. PDF Processing Queue (`queues/pdfProcessingQueue.js`)**

**Purpose**: Queue for PDF processing jobs

**Job Data Structure**:
```javascript
{
  pdfId: "507f1f77bcf86cd799439011",
  userId: "507f1f77bcf86cd799439012",
  filePath: "/uploads/document.pdf"
}
```

**Job Options**:
```javascript
{
  priority: 1,  // Higher priority for smaller files
  timeout: 300000  // 5 minutes timeout
}
```

**Implementation Pattern**:
```javascript
const { createQueue } = require('../config/queue');
const pdfProcessor = require('../workers/pdfProcessor');
const logger = require('../utils/logger');

const PDF_PROCESSING_QUEUE = 'pdf-processing';
const pdfQueue = createQueue(PDF_PROCESSING_QUEUE);

// Set default job options
pdfQueue.setDefaultJobOptions({
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  },
  timeout: 300000  // 5 minutes
});

// Process jobs
pdfQueue.process(async (job) => {
  logger.info(`Processing PDF job ${job.id}`, job.data);
  return await pdfProcessor.processPDF(job);
});

// Add job to queue
const addPDFProcessingJob = async (pdfData) => {
  const job = await pdfQueue.add(pdfData, {
    priority: pdfData.fileSize < 5000000 ? 1 : 2  // Higher priority for smaller files
  });

  logger.info(`Added PDF processing job: ${job.id}`);
  return job;
};

// Get job status
const getPDFJobStatus = async (jobId) => {
  const job = await pdfQueue.getJob(jobId);
  if (!job) {
    return null;
  }

  const state = await job.getState();
  return {
    id: job.id,
    state,
    progress: job.progress(),
    data: job.data,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn
  };
};

module.exports = {
  pdfQueue,
  addPDFProcessingJob,
  getPDFJobStatus
};
```

---

### **C. Quiz Generation Queue (`queues/quizGenerationQueue.js`)**

**Purpose**: Queue for quiz generation jobs

**Job Data Structure**:
```javascript
{
  quizId: "507f1f77bcf86cd799439011",
  userId: "507f1f77bcf86cd799439012",
  pdfId: "507f1f77bcf86cd799439013",
  options: {
    mcqCount: 10,
    saqCount: 5,
    laqCount: 3,
    difficulty: "medium"
  }
}
```

**Implementation Pattern**:
```javascript
const { createQueue } = require('../config/queue');
const quizGenerator = require('../workers/quizGenerator');
const logger = require('../utils/logger');

const QUIZ_GENERATION_QUEUE = 'quiz-generation';
const quizQueue = createQueue(QUIZ_GENERATION_QUEUE);

// Set default job options
quizQueue.setDefaultJobOptions({
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 3000
  },
  timeout: 600000  // 10 minutes timeout (LLM calls can be slow)
});

// Process jobs
quizQueue.process(async (job) => {
  logger.info(`Processing quiz generation job ${job.id}`, job.data);
  return await quizGenerator.generateQuiz(job);
});

// Add job to queue
const addQuizGenerationJob = async (quizData) => {
  const job = await quizQueue.add(quizData);
  logger.info(`Added quiz generation job: ${job.id}`);
  return job;
};

// Get job status
const getQuizJobStatus = async (jobId) => {
  const job = await quizQueue.getJob(jobId);
  if (!job) {
    return null;
  }

  const state = await job.getState();
  return {
    id: job.id,
    state,
    progress: job.progress(),
    data: job.data,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn
  };
};

module.exports = {
  quizQueue,
  addQuizGenerationJob,
  getQuizJobStatus
};
```

---

### **D. PDF Processor Worker (`workers/pdfProcessor.js`)**

**Purpose**: Process PDF files (parsing, chunking, embedding)

**Note**: Full implementation will come in Module 5. For now, create a stub that simulates processing.

**Flow**:
1. Update PDF status to "processing"
2. Parse PDF (extract text) - **stub for now**
3. Chunk text - **stub for now**
4. Generate embeddings - **stub for now**
5. Store in ChromaDB - **stub for now**
6. Update PDF status to "ready"
7. Report progress

**Implementation Pattern (Stub for Module 4)**:
```javascript
const { PDF } = require('../models');
const logger = require('../utils/logger');
const ApiError = require('../utils/apiError');

class PDFProcessor {
  async processPDF(job) {
    const { pdfId, userId, filePath } = job.data;

    try {
      // Update status to processing
      await PDF.findByIdAndUpdate(pdfId, {
        status: 'processing',
        processingError: null
      });

      job.progress(10);
      logger.info(`PDF ${pdfId}: Status updated to processing`);

      // Simulate PDF parsing (will be implemented in Module 5)
      await this.simulateProcessing(job, 'Parsing PDF', 30);

      // Simulate text chunking (will be implemented in Module 5)
      await this.simulateProcessing(job, 'Chunking text', 50);

      // Simulate embedding generation (will be implemented in Module 5)
      await this.simulateProcessing(job, 'Generating embeddings', 80);

      // Simulate storing in ChromaDB (will be implemented in Module 5)
      await this.simulateProcessing(job, 'Storing embeddings', 95);

      // Update PDF status to ready
      const updatedPDF = await PDF.findByIdAndUpdate(
        pdfId,
        {
          status: 'ready',
          'embeddingStats.totalChunks': 50,  // Mock value
          'embeddingStats.embeddedChunks': 50,
          'embeddingStats.lastProcessedAt': new Date()
        },
        { new: true }
      );

      job.progress(100);
      logger.info(`PDF ${pdfId}: Processing completed successfully`);

      return {
        success: true,
        pdfId,
        chunksProcessed: 50
      };

    } catch (error) {
      logger.error(`PDF ${pdfId}: Processing failed`, error);

      // Update PDF status to failed
      await PDF.findByIdAndUpdate(pdfId, {
        status: 'failed',
        processingError: error.message
      });

      throw error;
    }
  }

  // Simulate processing with delay (for testing)
  async simulateProcessing(job, stepName, progressPercent) {
    logger.info(`PDF ${job.data.pdfId}: ${stepName}`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
    job.progress(progressPercent);
  }
}

module.exports = new PDFProcessor();
```

---

### **E. Quiz Generator Worker (`workers/quizGenerator.js`)**

**Purpose**: Generate quizzes using LLM

**Note**: Full implementation will come in Module 7. For now, create a stub.

**Implementation Pattern (Stub for Module 4)**:
```javascript
const { Quiz } = require('../models');
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

      // Simulate LLM calls (will be implemented in Module 7)
      await this.simulateGeneration(job, 'Fetching PDF content', 30);
      await this.simulateGeneration(job, 'Generating MCQs', 50);
      await this.simulateGeneration(job, 'Generating SAQs', 70);
      await this.simulateGeneration(job, 'Generating LAQs', 90);

      // Mock generated questions
      const mockQuestions = this.generateMockQuestions(options);

      // Update quiz with questions
      const updatedQuiz = await Quiz.findByIdAndUpdate(
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
        generationError: error.message
      });

      throw error;
    }
  }

  async simulateGeneration(job, stepName, progressPercent) {
    logger.info(`Quiz ${job.data.quizId}: ${stepName}`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
    job.progress(progressPercent);
  }

  generateMockQuestions(options) {
    const questions = [];
    const { mcqCount = 5, saqCount = 3, laqCount = 2 } = options;

    // Mock MCQs
    for (let i = 0; i < mcqCount; i++) {
      questions.push({
        type: 'MCQ',
        question: `Mock MCQ Question ${i + 1}`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'Option A',
        explanation: 'This is a mock explanation.',
        topic: 'Physics',
        difficulty: 'medium',
        points: 1
      });
    }

    // Mock SAQs
    for (let i = 0; i < saqCount; i++) {
      questions.push({
        type: 'SAQ',
        question: `Mock SAQ Question ${i + 1}`,
        options: [],
        correctAnswer: 'Mock short answer.',
        explanation: 'This is a mock explanation.',
        topic: 'Physics',
        difficulty: 'medium',
        points: 2
      });
    }

    // Mock LAQs
    for (let i = 0; i < laqCount; i++) {
      questions.push({
        type: 'LAQ',
        question: `Mock LAQ Question ${i + 1}`,
        options: [],
        correctAnswer: 'Mock long answer with detailed explanation.',
        explanation: 'This is a mock explanation.',
        topic: 'Physics',
        difficulty: 'hard',
        points: 5
      });
    }

    return questions;
  }
}

module.exports = new QuizGenerator();
```

---

### **F. Job Service (`services/jobService.js`)**

**Purpose**: Business logic for job management

**Functions**:
1. **`getJobStatus(jobId, queueType)`** - Get status of any job
2. **`getQueueStats(queueType)`** - Get queue statistics
3. **`retryFailedJob(jobId, queueType)`** - Manually retry a failed job
4. **`cleanQueue(queueType)`** - Clean completed/failed jobs

**Implementation Pattern**:
```javascript
const { pdfQueue } = require('../queues/pdfProcessingQueue');
const { quizQueue } = require('../queues/quizGenerationQueue');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');

class JobService {
  getQueue(queueType) {
    switch (queueType) {
      case 'pdf':
        return pdfQueue;
      case 'quiz':
        return quizQueue;
      default:
        throw ApiError.badRequest('Invalid queue type', 'INVALID_QUEUE_TYPE');
    }
  }

  async getJobStatus(jobId, queueType) {
    const queue = this.getQueue(queueType);
    const job = await queue.getJob(jobId);

    if (!job) {
      throw ApiError.notFound('Job not found', 'JOB_NOT_FOUND');
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
      id: job.id,
      state,
      progress,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      timestamp: job.timestamp
    };
  }

  async getQueueStats(queueType) {
    const queue = this.getQueue(queueType);

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);

    return {
      queueType,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed
    };
  }

  async retryFailedJob(jobId, queueType) {
    const queue = this.getQueue(queueType);
    const job = await queue.getJob(jobId);

    if (!job) {
      throw ApiError.notFound('Job not found', 'JOB_NOT_FOUND');
    }

    const state = await job.getState();
    if (state !== 'failed') {
      throw ApiError.badRequest('Only failed jobs can be retried', 'JOB_NOT_FAILED');
    }

    await job.retry();
    logger.info(`Job ${jobId} retried in ${queueType} queue`);

    return {
      message: 'Job retried successfully',
      jobId,
      queueType
    };
  }

  async cleanQueue(queueType, grace = 86400000) {
    // grace = 24 hours in milliseconds
    const queue = this.getQueue(queueType);

    const result = await queue.clean(grace, 'completed');
    const failedResult = await queue.clean(grace, 'failed');

    logger.info(`Cleaned ${queueType} queue: ${result.length} completed, ${failedResult.length} failed`);

    return {
      queueType,
      completedCleaned: result.length,
      failedCleaned: failedResult.length
    };
  }
}

module.exports = new JobService();
```

---

### **G. Job Controller (`controllers/jobController.js`)**

**Purpose**: Handle HTTP requests for job management

**Functions**:
1. **`getJobStatus(req, res)`** - Get job status by ID
2. **`getQueueStats(req, res)`** - Get queue statistics
3. **`retryJob(req, res)`** - Retry a failed job

**Implementation Pattern**:
```javascript
const jobService = require('../services/jobService');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

class JobController {
  getJobStatus = asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const { queueType } = req.query;

    const status = await jobService.getJobStatus(jobId, queueType);

    return successResponse(
      res,
      200,
      'Job status retrieved successfully',
      { job: status }
    );
  });

  getQueueStats = asyncHandler(async (req, res) => {
    const { queueType } = req.params;

    const stats = await jobService.getQueueStats(queueType);

    return successResponse(
      res,
      200,
      'Queue statistics retrieved successfully',
      { stats }
    );
  });

  retryJob = asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const { queueType } = req.body;

    const result = await jobService.retryFailedJob(jobId, queueType);

    return successResponse(
      res,
      200,
      'Job retry initiated',
      result
    );
  });
}

module.exports = new JobController();
```

---

### **H. Job Routes (`routes/jobRoutes.js`)**

**Purpose**: Define job management endpoints

**Routes**:

| Method | Endpoint | Middleware | Controller | Description |
|--------|----------|------------|------------|-------------|
| GET | `/jobs/:jobId` | authenticate | jobController.getJobStatus | Get job status |
| GET | `/queues/:queueType/stats` | authenticate | jobController.getQueueStats | Get queue stats |
| POST | `/jobs/:jobId/retry` | authenticate | jobController.retryJob | Retry failed job |

**Implementation Pattern**:
```javascript
const express = require('express');
const jobController = require('../controllers/jobController');
const authenticate = require('../middlewares/authenticate');

const router = express.Router();

// All job routes require authentication
router.use(authenticate);

// Job management
router.get('/jobs/:jobId', jobController.getJobStatus);
router.post('/jobs/:jobId/retry', jobController.retryJob);

// Queue statistics
router.get('/queues/:queueType/stats', jobController.getQueueStats);

module.exports = router;
```

---

### **I. Job Helper Utilities (`utils/jobHelper.js`)**

**Purpose**: Utility functions for job operations

**Functions**:
1. **`createJobId(prefix)`** - Generate unique job IDs
2. **`calculateProgress(current, total)`** - Calculate percentage
3. **`getJobPriority(fileSize)`** - Determine job priority based on file size

**Implementation Pattern**:
```javascript
const createJobId = (prefix = 'job') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
};

const calculateProgress = (current, total) => {
  if (total === 0) return 0;
  return Math.round((current / total) * 100);
};

const getJobPriority = (fileSize) => {
  // Smaller files get higher priority (lower number = higher priority)
  if (fileSize < 1000000) return 1;      // < 1MB
  if (fileSize < 5000000) return 2;      // < 5MB
  if (fileSize < 10000000) return 3;     // < 10MB
  return 4;                               // >= 10MB
};

module.exports = {
  createJobId,
  calculateProgress,
  getJobPriority
};
```

---

### **J. Update Environment Configuration**

**Add to `src/config/env.js`**:
```javascript
redisHost: process.env.REDIS_HOST || 'localhost',
redisPort: parseInt(process.env.REDIS_PORT, 10) || 6379,
redisPassword: process.env.REDIS_PASSWORD || undefined,
```

**Add to `.env.example`**:
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

---

### **K. Update App.js to Include Job Routes**

**Add to `src/app.js`** (after auth routes):

```javascript
const jobRoutes = require('./routes/jobRoutes');

app.use('/api', jobRoutes);
```

---

## 5. Queue States

Bull jobs can be in one of these states:

| State | Description |
|-------|-------------|
| `waiting` | Job is waiting to be processed |
| `active` | Job is currently being processed |
| `completed` | Job completed successfully |
| `failed` | Job failed after all retry attempts |
| `delayed` | Job is delayed (scheduled for later) |
| `paused` | Queue is paused |

---

## 6. API Request/Response Examples

### **Get Job Status**
```bash
GET /api/jobs/123?queueType=pdf
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Job status retrieved successfully",
  "data": {
    "job": {
      "id": "123",
      "state": "active",
      "progress": 45,
      "data": {
        "pdfId": "507f1f77bcf86cd799439011",
        "userId": "507f1f77bcf86cd799439012",
        "filePath": "/uploads/document.pdf"
      },
      "attemptsMade": 1,
      "processedOn": 1696598400000
    }
  }
}
```

### **Get Queue Statistics**
```bash
GET /api/queues/pdf/stats
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Queue statistics retrieved successfully",
  "data": {
    "stats": {
      "queueType": "pdf",
      "waiting": 5,
      "active": 2,
      "completed": 150,
      "failed": 3,
      "delayed": 0,
      "total": 160
    }
  }
}
```

### **Retry Failed Job**
```bash
POST /api/jobs/123/retry
Authorization: Bearer <token>
Content-Type: application/json

{
  "queueType": "pdf"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Job retry initiated",
  "data": {
    "message": "Job retried successfully",
    "jobId": "123",
    "queueType": "pdf"
  }
}
```

---

## 7. Testing Checklist

After implementation:

- [ ] Redis connection established successfully
- [ ] Bull queues created without errors
- [ ] Can add jobs to PDF processing queue
- [ ] Can add jobs to quiz generation queue
- [ ] Jobs are processed asynchronously
- [ ] Job progress updates correctly
- [ ] Failed jobs retry automatically
- [ ] Job status can be queried via API
- [ ] Queue statistics are accurate
- [ ] Worker logs show processing steps

---
