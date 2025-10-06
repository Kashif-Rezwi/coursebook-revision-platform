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
  updateAfterQuiz(quizAttempt: any, quiz: any): Promise<IProgress>;
  calculateWeakAndStrongTopics(): void;
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

// Update progress after quiz completion
progressSchema.methods['updateAfterQuiz'] = async function(quizAttempt: any, quiz: any): Promise<IProgress> {
  const self = this as any;
  
  // Update overall stats
  self.overallStats.totalQuizzes += 1;
  self.overallStats.totalQuestions += quizAttempt.answers.length;
  self.overallStats.correctAnswers += quizAttempt.answers.filter((a: any) => a.isCorrect).length;
  self.overallStats.averageScore = 
    ((self.overallStats.averageScore * (self.overallStats.totalQuizzes - 1)) + quizAttempt.percentage) / 
    self.overallStats.totalQuizzes;
  
  if (quizAttempt.timeTaken) {
    self.overallStats.totalTimeSpent += quizAttempt.timeTaken;
  }

  // Update topic performance
  quiz.questions.forEach((question: any, index: number) => {
    const answer = quizAttempt.answers[index];
    const topicIndex = self.topicPerformance.findIndex((t: any) => t.topic === question.topic);

    if (topicIndex === -1) {
      // New topic
      self.topicPerformance.push({
        topic: question.topic,
        totalQuestions: 1,
        correctAnswers: answer.isCorrect ? 1 : 0,
        accuracy: answer.isCorrect ? 100 : 0,
        lastAttemptedAt: new Date()
      });
    } else {
      // Existing topic
      const topic = self.topicPerformance[topicIndex];
      topic.totalQuestions += 1;
      if (answer.isCorrect) {
        topic.correctAnswers += 1;
      }
      topic.accuracy = (topic.correctAnswers / topic.totalQuestions) * 100;
      topic.lastAttemptedAt = new Date();
    }
  });

  // Calculate weak and strong topics
  self.calculateWeakAndStrongTopics();

  // Add recent activity
  self.recentActivity.unshift({
    type: 'quiz_completed',
    description: `Completed quiz: ${quiz.title}`,
    timestamp: new Date()
  });

  // Keep only last 20 activities
  if (self.recentActivity.length > 20) {
    self.recentActivity = self.recentActivity.slice(0, 20);
  }

  self.lastUpdated = new Date();
  return self.save();
};

// Calculate weak and strong topics
progressSchema.methods['calculateWeakAndStrongTopics'] = function(): void {
  const self = this as any;
  const sortedTopics = [...self.topicPerformance]
    .filter((t: any) => t.totalQuestions >= 3) // Only consider topics with at least 3 questions
    .sort((a: any, b: any) => a.accuracy - b.accuracy);

  // Weak topics (accuracy < 60%)
  self.weakTopics = sortedTopics
    .filter((t: any) => t.accuracy < 60)
    .slice(0, 5)
    .map((t: any) => ({ topic: t.topic, accuracy: t.accuracy }));

  // Strong topics (accuracy >= 80%)
  self.strongTopics = sortedTopics
    .filter((t: any) => t.accuracy >= 80)
    .slice(-5)
    .reverse()
    .map((t: any) => ({ topic: t.topic, accuracy: t.accuracy }));
};

export default mongoose.model<IProgress>('Progress', progressSchema);
