# Module 2: Database Configuration - Low-Level Design (LLD)

---

## 1. Module Overview

**Purpose**: Establish database connectivity and define all data schemas for the application.

**Responsibilities**:
- MongoDB connection setup with proper error handling
- ChromaDB client initialization for vector storage
- Define Mongoose schemas and models for all entities
- Implement database health checks
- Create seed scripts for initial data (NCERT PDFs)
- Handle database connection lifecycle

**Success Criteria**:
- MongoDB connects successfully on startup
- ChromaDB client initializes without errors
- All Mongoose models are properly defined with validation
- Database connections close gracefully on shutdown
- Seed script successfully populates initial NCERT PDFs

---

## 2. Directory Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── env.js                      # (Already exists from Module 1)
│   │   ├── database.js                 # MongoDB connection
│   │   └── chromadb.js                 # ChromaDB client
│   │
│   ├── models/
│   │   ├── User.js                     # User schema
│   │   ├── PDF.js                      # PDF metadata schema
│   │   ├── Chat.js                     # Chat session schema
│   │   ├── Quiz.js                     # Quiz schema
│   │   ├── QuizAttempt.js              # Quiz attempt schema
│   │   └── Progress.js                 # User progress schema
│   │
│   ├── scripts/
│   │   └── seedDatabase.js             # Seed NCERT PDFs
│   │
│   └── server.js                       # (Update to include DB connection)
│
└── seeds/                               # Seed data files
    └── ncert-pdfs.json                 # NCERT PDF metadata
```

---

## 3. Technology Stack for Module 2

**New Dependencies**:
```json
{
  "mongoose": "^8.0.0",
  "chromadb": "^1.7.0",
  "bcryptjs": "^2.4.3"
}
```

---

## 4. Detailed Component Design

### **A. MongoDB Connection (`config/database.js`)**

**Purpose**: Establish and manage MongoDB connection

**Connection Options**:
```javascript
{
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
}
```

**Features**:
- Automatic reconnection on failure
- Connection event listeners (connected, error, disconnected)
- Graceful disconnect function
- Connection health check

**Implementation Pattern**:
```javascript
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('./env');

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongodbUri, options);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Event listeners
mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  logger.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected from MongoDB');
});

const disconnectDB = async () => {
  await mongoose.connection.close();
  logger.info('MongoDB disconnected');
};

module.exports = { connectDB, disconnectDB };
```

---

### **B. ChromaDB Client (`config/chromadb.js`)**

**Purpose**: Initialize ChromaDB client for vector storage

**Configuration**:
```javascript
{
  path: config.chromadbHost + ':' + config.chromadbPort
}
```

**Collections**:
- `pdf_embeddings` - Stores PDF chunk embeddings

**Features**:
- Lazy initialization (connect on first use)
- Collection creation if not exists
- Health check function

**Implementation Pattern**:
```javascript
const { ChromaClient } = require('chromadb');
const logger = require('../utils/logger');
const config = require('./env');

let client = null;
let collection = null;

const initChromaDB = async () => {
  try {
    client = new ChromaClient({
      path: `http://${config.chromadbHost}:${config.chromadbPort}`
    });
    
    // Get or create collection
    collection = await client.getOrCreateCollection({
      name: 'pdf_embeddings',
      metadata: { description: 'PDF chunk embeddings for RAG' }
    });
    
    logger.info('ChromaDB initialized successfully');
    return collection;
  } catch (error) {
    logger.error('ChromaDB initialization failed:', error);
    throw error;
  }
};

const getCollection = async () => {
  if (!collection) {
    await initChromaDB();
  }
  return collection;
};

module.exports = { initChromaDB, getCollection };
```

---

### **C. User Model (`models/User.js`)**

**Purpose**: Define user schema with authentication fields

**Schema**:
```javascript
{
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      message: 'Invalid email format'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false  // Don't include password in queries by default
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

**Instance Methods**:
- `comparePassword(candidatePassword)` - Compare hashed passwords
- `toJSON()` - Remove password from JSON output

**Middleware (Pre-save)**:
- Hash password before saving if modified
- Update `updatedAt` timestamp

**Indexes**:
- `email` (unique)

---

### **D. PDF Model (`models/PDF.js`)**

**Purpose**: Store PDF metadata and processing status

**Schema**:
```javascript
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true  // in bytes
  },
  mimeType: {
    type: String,
    default: 'application/pdf'
  },
  pageCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'ready', 'failed'],
    default: 'uploading'
  },
  processingError: {
    type: String,
    default: null
  },
  metadata: {
    title: String,
    author: String,
    subject: String,
    keywords: [String]
  },
  embeddingStats: {
    totalChunks: { type: Number, default: 0 },
    embeddedChunks: { type: Number, default: 0 },
    lastProcessedAt: Date
  },
  isSeeded: {
    type: Boolean,
    default: false  // True for NCERT seed PDFs
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

**Indexes**:
- `userId` (for user's PDFs)
- `status` (for filtering by status)
- `isSeeded` (for identifying seed data)

**Virtual Fields**:
- `fileSizeMB` - Convert bytes to MB

---

### **E. Chat Model (`models/Chat.js`)**

**Purpose**: Store chat sessions and message history

**Schema**:
```javascript
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    default: 'New Chat'
  },
  pdfIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PDF'
  }],
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    citations: [{
      pdfId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PDF'
      },
      pageNumber: Number,
      snippet: String
    }],
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

**Indexes**:
- `userId` (for user's chats)
- `updatedAt` (for sorting by recent)

**Instance Methods**:
- `addMessage(role, content, citations)` - Add new message to chat

---

### **F. Quiz Model (`models/Quiz.js`)**

**Purpose**: Store generated quizzes

**Schema**:
```javascript
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  pdfId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PDF',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  questions: [{
    type: {
      type: String,
      enum: ['MCQ', 'SAQ', 'LAQ'],
      required: true
    },
    question: {
      type: String,
      required: true
    },
    options: [{
      type: String
    }],  // Only for MCQs
    correctAnswer: {
      type: String,
      required: true
    },
    explanation: {
      type: String,
      required: true
    },
    topic: {
      type: String,
      required: true
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    points: {
      type: Number,
      default: 1
    }
  }],
  totalQuestions: {
    type: Number,
    default: 0
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['generating', 'ready', 'failed'],
    default: 'generating'
  },
  generationError: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

**Indexes**:
- `userId, pdfId` (compound index)
- `status`

**Pre-save Middleware**:
- Calculate `totalQuestions` and `totalPoints`

---

### **G. QuizAttempt Model (`models/QuizAttempt.js`)**

**Purpose**: Store user's quiz submissions and scores

**Schema**:
```javascript
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
    index: true
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    userAnswer: {
      type: String,
      required: true
    },
    isCorrect: {
      type: Boolean,
      required: true
    },
    pointsEarned: {
      type: Number,
      required: true
    },
    feedback: {
      type: String  // LLM-generated feedback for SAQ/LAQ
    }
  }],
  score: {
    type: Number,
    required: true
  },
  totalPoints: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  timeTaken: {
    type: Number  // in seconds
  },
  completedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}
```

**Indexes**:
- `userId, quizId` (compound index)
- `completedAt` (for sorting)

---

### **H. Progress Model (`models/Progress.js`)**

**Purpose**: Track user's learning progress and analytics

**Schema**:
```javascript
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  overallStats: {
    totalQuizzes: {
      type: Number,
      default: 0
    },
    totalQuestions: {
      type: Number,
      default: 0
    },
    correctAnswers: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    totalTimeSent: {
      type: Number,
      default: 0  // in seconds
    }
  },
  topicPerformance: [{
    topic: {
      type: String,
      required: true
    },
    totalQuestions: {
      type: Number,
      default: 0
    },
    correctAnswers: {
      type: Number,
      default: 0
    },
    accuracy: {
      type: Number,
      default: 0  // percentage
    },
    lastAttemptedAt: {
      type: Date
    }
  }],
  weakTopics: [{
    topic: String,
    accuracy: Number
  }],
  strongTopics: [{
    topic: String,
    accuracy: Number
  }],
  recentActivity: [{
    type: {
      type: String,
      enum: ['quiz_completed', 'pdf_uploaded', 'chat_session']
    },
    description: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}
```

**Indexes**:
- `userId` (unique)

**Instance Methods**:
- `updateAfterQuiz(quizAttempt, quiz)` - Update stats after quiz completion
- `calculateWeakAndStrongTopics()` - Identify weak/strong topics

---

### **I. Seed Script (`scripts/seedDatabase.js`)**

**Purpose**: Populate database with initial NCERT PDF data

**Functionality**:
- Check if seed data already exists
- Create admin user if not exists
- Insert NCERT PDF metadata (without actual files for MVP)
- Mark PDFs as `isSeeded: true`
- Set status as `ready` (assume pre-processed)

**Seed Data Structure** (`seeds/ncert-pdfs.json`):
```json
[
  {
    "filename": "ncert-physics-class-11-chapter-1.pdf",
    "originalName": "NCERT Physics Class 11 - Chapter 1: Physical World",
    "filePath": "/seeds/pdfs/ncert-physics-class-11-chapter-1.pdf",
    "fileSize": 2457600,
    "pageCount": 15,
    "metadata": {
      "title": "Physical World",
      "author": "NCERT",
      "subject": "Physics",
      "keywords": ["physics", "class 11", "physical world", "science"]
    }
  },
  {
    "filename": "ncert-physics-class-11-chapter-2.pdf",
    "originalName": "NCERT Physics Class 11 - Chapter 2: Units and Measurements",
    "filePath": "/seeds/pdfs/ncert-physics-class-11-chapter-2.pdf",
    "fileSize": 3145728,
    "pageCount": 20,
    "metadata": {
      "title": "Units and Measurements",
      "author": "NCERT",
      "subject": "Physics",
      "keywords": ["physics", "class 11", "units", "measurements"]
    }
  }
]
```

**Script Execution**:
```bash
npm run seed
```

---

## 5. Database Schema Relationships

```
User (1) ──────────── (many) PDF
  │                              │
  │                              │
  │                         (many)
  │                              │
  └────────────────────────── Quiz
  │                              │
  │                              │
  │                         (many)
  │                              │
  └────────────── QuizAttempt ───┘
  │
  │
  └──────────────────────── Chat (many)
  │
  │
  └──────────────────────── Progress (1:1)
```

---

## 6. Environment Variable Updates

Add to `.env.example` and `.env`:
```env
# ChromaDB Configuration
CHROMADB_HOST=localhost
CHROMADB_PORT=8000
```

---

## 7. Server.js Integration

Update `src/server.js` to:
1. Import database connection functions
2. Connect to MongoDB before starting server
3. Initialize ChromaDB
4. Disconnect databases on shutdown

---

## 8. Package.json Scripts Update

Add seed script:
```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "seed": "node src/scripts/seedDatabase.js"
  }
}
```

---

## 9. Model Export Pattern

Each model file should export the Mongoose model:
```javascript
module.exports = mongoose.model('User', userSchema);
```

Create `src/models/index.js` for centralized imports:
```javascript
module.exports = {
  User: require('./User'),
  PDF: require('./PDF'),
  Chat: require('./Chat'),
  Quiz: require('./Quiz'),
  QuizAttempt: require('./QuizAttempt'),
  Progress: require('./Progress')
};
```

---

## 10. Testing Checklist

After implementation:

- [ ] MongoDB connects successfully
- [ ] ChromaDB initializes without errors
- [ ] All models are defined without validation errors
- [ ] Seed script runs successfully
- [ ] Can create a user with hashed password
- [ ] Can create a PDF document
- [ ] Server shuts down gracefully, closing DB connections
- [ ] Running seed script twice doesn't duplicate data

---
