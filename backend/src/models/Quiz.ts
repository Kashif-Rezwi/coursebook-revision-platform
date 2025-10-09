import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestion {
  type: 'MCQ' | 'SAQ' | 'LAQ';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

export interface IQuiz extends Document {
  userId: mongoose.Types.ObjectId;
  pdfId: mongoose.Types.ObjectId;
  title: string;
  questions: IQuestion[];
  totalQuestions: number;
  totalPoints: number;
  status: 'generating' | 'ready' | 'failed';
  generationError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const quizSchema = new Schema<IQuiz>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  pdfId: {
    type: Schema.Types.ObjectId,
    ref: 'PDF',
    required: [true, 'PDF ID is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Quiz title is required']
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
    }],
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
    default: 'generating',
    index: true
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
});

// Calculate totals before saving
quizSchema.pre('save', function(next) {
  this.totalQuestions = this.questions.length;
  this.totalPoints = this.questions.reduce((sum, q) => sum + q.points, 0);
  this.updatedAt = new Date();
  next();
});

// Compound index
quizSchema.index({ userId: 1, pdfId: 1 });

export default mongoose.model<IQuiz>('Quiz', quizSchema);
