import mongoose, { Document, Schema } from 'mongoose';

export interface IAnswer {
  questionId: mongoose.Types.ObjectId;
  userAnswer: string;
  isCorrect: boolean;
  pointsEarned: number;
  feedback?: string;
}

export interface IQuizAttempt extends Document {
  userId: mongoose.Types.ObjectId;
  quizId: mongoose.Types.ObjectId;
  answers: IAnswer[];
  score: number;
  totalPoints: number;
  percentage: number;
  timeTaken?: number;
  completedAt: Date;
  createdAt: Date;
}

const quizAttemptSchema = new Schema<IQuizAttempt>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  quizId: {
    type: Schema.Types.ObjectId,
    ref: 'Quiz',
    required: [true, 'Quiz ID is required'],
    index: true
  },
  answers: [{
    questionId: {
      type: Schema.Types.ObjectId,
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
      type: String
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
    type: Number
  },
  completedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
quizAttemptSchema.index({ userId: 1, quizId: 1 });
quizAttemptSchema.index({ completedAt: -1 });

export default mongoose.model<IQuizAttempt>('QuizAttempt', quizAttemptSchema);
