import mongoose, { Document, Schema } from 'mongoose';

export interface IOverallStats {
  totalQuizzes: number;
  totalQuestions: number;
  correctAnswers: number;
  averageScore: number;
  totalTimeSpent: number;
}

export interface ITopicPerformance {
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  lastAttemptedAt?: Date;
}

export interface IWeakTopic {
  topic: string;
  accuracy: number;
}

export interface IStrongTopic {
  topic: string;
  accuracy: number;
}

export interface IRecentActivity {
  type: 'quiz_completed' | 'pdf_uploaded' | 'chat_session' | 'account_created';
  description: string;
  timestamp: Date;
}

export interface IProgress extends Document {
  userId: mongoose.Types.ObjectId;
  overallStats: IOverallStats;
  topicPerformance: ITopicPerformance[];
  weakTopics: IWeakTopic[];
  strongTopics: IStrongTopic[];
  recentActivity: IRecentActivity[];
  lastUpdated: Date;
  createdAt: Date;
}

const progressSchema = new Schema<IProgress>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
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
    totalTimeSpent: {
      type: Number,
      default: 0
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
      default: 0
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
      enum: ['quiz_completed', 'pdf_uploaded', 'chat_session', 'account_created']
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
});


export default mongoose.model<IProgress>('Progress', progressSchema);
