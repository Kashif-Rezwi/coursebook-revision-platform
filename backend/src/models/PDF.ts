import mongoose, { Document, Schema } from 'mongoose';

export interface IPDF extends Document {
  userId: mongoose.Types.ObjectId;
  filename: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  pageCount: number;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  processingError?: string;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
  };
  embeddingStats: {
    totalChunks: number;
    embeddedChunks: number;
    lastProcessedAt?: Date;
  };
  isSeeded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pdfSchema = new Schema<IPDF>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  filename: {
    type: String,
    required: [true, 'Filename is required']
  },
  originalName: {
    type: String,
    required: [true, 'Original name is required']
  },
  filePath: {
    type: String,
    required: [true, 'File path is required']
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required']
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
    default: 'uploading',
    index: true
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
    default: false,
    index: true
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

// Update updatedAt on save
pdfSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});


// Indexes
pdfSchema.index({ userId: 1, status: 1 });

export default mongoose.model<IPDF>('PDF', pdfSchema);
