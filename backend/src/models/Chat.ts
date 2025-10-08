import mongoose, { Document, Schema } from 'mongoose';

export interface ICitation {
  pdfId: mongoose.Types.ObjectId;
  pageNumber?: number;
  snippet?: string;
}

export interface IMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: ICitation[];
  timestamp: Date;
}

export interface IChat extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  pdfIds: mongoose.Types.ObjectId[];
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  title: {
    type: String,
    default: 'New Chat'
  },
  pdfIds: [{
    type: Schema.Types.ObjectId,
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
        type: Schema.Types.ObjectId,
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
});

// Update updatedAt on save
chatSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});


// Indexes
chatSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model<IChat>('Chat', chatSchema);
