# Module 5: PDF Management Service - Low-Level Design (LLD)

---

## 1. Module Overview

**Purpose**: Implement comprehensive PDF file management with upload, storage, parsing, chunking, embedding generation, and vector storage.

**Responsibilities**:
- Handle PDF file uploads (multipart/form-data)
- Store files securely on filesystem or cloud storage
- Parse PDF files to extract text content
- Chunk text into manageable segments for embeddings
- Generate embeddings using Vercel AI SDK
- Store embeddings in ChromaDB with metadata
- Provide CRUD operations for PDFs
- Trigger asynchronous PDF processing via job queue
- Track PDF processing status

**Success Criteria**:
- Users can upload PDF files (max 50MB)
- Files are stored securely with unique filenames
- PDFs are parsed and text is extracted successfully
- Text is chunked with overlap for context preservation
- Embeddings are generated and stored in ChromaDB
- Users can list, retrieve, and delete their PDFs
- Processing status is trackable in real-time
- Proper error handling for file operations

---

## 2. Directory Structure

```
backend/
├── src/
│   ├── config/
│   │   └── multer.js                   # File upload configuration
│   │
│   ├── services/
│   │   ├── pdfService.js               # PDF business logic
│   │   └── embeddingService.js         # Embedding generation
│   │
│   ├── controllers/
│   │   └── pdfController.js            # PDF route handlers
│   │
│   ├── routes/
│   │   └── pdfRoutes.js                # PDF API routes
│   │
│   ├── utils/
│   │   ├── pdfParser.js                # PDF text extraction
│   │   ├── textChunker.js              # Text chunking logic
│   │   ├── fileStorage.js              # File storage operations
│   │   └── chromaHelper.js             # ChromaDB operations
│   │
│   ├── validators/
│   │   └── pdfValidator.js             # PDF upload validation
│   │
│   └── workers/
│       └── pdfProcessor.js             # (Update existing)
│
├── uploads/                             # Local file storage (gitignored)
│   └── .gitkeep
│
└── temp/                                # Temporary upload folder
    └── .gitkeep
```

---

## 3. Technology Stack for Module 5

**New Dependencies**:
```json
{
  "multer": "^1.4.5-lts.1",
  "pdf-parse": "^1.1.1",
  "@ai-sdk/openai": "^0.0.24",
  "ai": "^3.0.0"
}
```

**Note**: We'll use Vercel AI SDK with OpenAI provider for embeddings.

---

## 4. Detailed Component Design

### **A. Multer Configuration (`config/multer.js`)**

**Purpose**: Configure file upload middleware

**Configuration**:
```javascript
{
  storage: diskStorage,
  limits: {
    fileSize: 52428800,  // 50MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Only accept PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
}
```

**Features**:
- Store files in `uploads/` directory
- Generate unique filenames using UUID + timestamp
- Validate file type (PDF only)
- Enforce file size limit (50MB)
- Preserve original filename in metadata

**Implementation Pattern**:
```javascript
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('./env');
const ApiError = require('../utils/apiError');

// Ensure upload directory exists
const uploadDir = config.fileUploadPath || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-uuid-originalname.pdf
    const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`;
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(ApiError.badRequest('Only PDF files are allowed', 'INVALID_FILE_TYPE'), false);
  }
};

// Multer instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.maxFileSize || 52428800,  // 50MB default
    files: 1
  },
  fileFilter: fileFilter
});

module.exports = upload;
```

---

### **B. PDF Parser (`utils/pdfParser.js`)**

**Purpose**: Extract text content from PDF files

**Technology**: pdf-parse library

**Function**:
- `parsePDF(filePath)` - Extract text and metadata from PDF

**Return Structure**:
```javascript
{
  text: "Full extracted text content...",
  numpages: 25,
  info: {
    Title: "Document Title",
    Author: "Author Name",
    Subject: "Subject",
    Keywords: "keyword1, keyword2"
  }
}
```

**Implementation Pattern**:
```javascript
const fs = require('fs');
const pdf = require('pdf-parse');
const logger = require('./logger');
const ApiError = require('./apiError');

const parsePDF = async (filePath) => {
  try {
    // Read PDF file
    const dataBuffer = fs.readFileSync(filePath);
    
    // Parse PDF
    const data = await pdf(dataBuffer);
    
    logger.info(`PDF parsed successfully: ${data.numpages} pages`);
    
    return {
      text: data.text,
      numpages: data.numpages,
      info: data.info || {}
    };
  } catch (error) {
    logger.error('PDF parsing failed:', error);
    throw ApiError.internal('Failed to parse PDF', 'PDF_PARSE_ERROR');
  }
};

module.exports = {
  parsePDF
};
```

---

### **C. Text Chunker (`utils/textChunker.js`)**

**Purpose**: Split text into chunks for embedding generation

**Strategy**:
- Fixed chunk size with overlap
- Preserve sentence boundaries
- Include metadata (chunk index, page number estimate)

**Configuration**:
```javascript
{
  chunkSize: 800,        // characters per chunk
  chunkOverlap: 200,     // overlap between chunks
  minChunkSize: 100      // minimum chunk size
}
```

**Function**:
- `chunkText(text, options)` - Split text into chunks

**Return Structure**:
```javascript
[
  {
    text: "Chunk content...",
    index: 0,
    startChar: 0,
    endChar: 800
  },
  {
    text: "Overlapping chunk...",
    index: 1,
    startChar: 600,
    endChar: 1400
  }
]
```

**Implementation Pattern**:
```javascript
const logger = require('./logger');

const DEFAULT_OPTIONS = {
  chunkSize: 800,
  chunkOverlap: 200,
  minChunkSize: 100
};

const chunkText = (text, options = {}) => {
  const { chunkSize, chunkOverlap, minChunkSize } = { ...DEFAULT_OPTIONS, ...options };
  
  if (!text || text.trim().length === 0) {
    return [];
  }
  
  const chunks = [];
  let startIndex = 0;
  let chunkIndex = 0;
  
  while (startIndex < text.length) {
    let endIndex = Math.min(startIndex + chunkSize, text.length);
    
    // Try to find sentence boundary near the end
    if (endIndex < text.length) {
      const sentenceEnd = text.lastIndexOf('.', endIndex);
      const questionEnd = text.lastIndexOf('?', endIndex);
      const exclamationEnd = text.lastIndexOf('!', endIndex);
      
      const boundary = Math.max(sentenceEnd, questionEnd, exclamationEnd);
      
      // Use sentence boundary if it's not too far back
      if (boundary > startIndex + minChunkSize) {
        endIndex = boundary + 1;
      }
    }
    
    const chunkText = text.substring(startIndex, endIndex).trim();
    
    if (chunkText.length >= minChunkSize) {
      chunks.push({
        text: chunkText,
        index: chunkIndex,
        startChar: startIndex,
        endChar: endIndex
      });
      chunkIndex++;
    }
    
    // Move to next chunk with overlap
    startIndex = endIndex - chunkOverlap;
    
    // Avoid infinite loop
    if (startIndex >= text.length) break;
  }
  
  logger.info(`Text chunked into ${chunks.length} segments`);
  
  return chunks;
};

const estimatePageNumber = (chunkStartChar, totalChars, totalPages) => {
  if (totalPages === 0 || totalChars === 0) return 1;
  const ratio = chunkStartChar / totalChars;
  return Math.max(1, Math.ceil(ratio * totalPages));
};

module.exports = {
  chunkText,
  estimatePageNumber,
  DEFAULT_OPTIONS
};
```

---

### **D. Embedding Service (`services/embeddingService.js`)**

**Purpose**: Generate embeddings using Vercel AI SDK

**Technology**: Vercel AI SDK with OpenAI embeddings

**Configuration**:
```javascript
{
  model: 'text-embedding-3-small',  // OpenAI embedding model
  dimensions: 1536                   // Embedding dimensions
}
```

**Functions**:
1. **`generateEmbedding(text)`** - Generate single embedding
2. **`generateBatchEmbeddings(texts)`** - Generate multiple embeddings efficiently

**Implementation Pattern**:
```javascript
const { openai } = require('@ai-sdk/openai');
const { embed, embedMany } = require('ai');
const config = require('../config/env');
const logger = require('../utils/logger');
const ApiError = require('../utils/apiError');

class EmbeddingService {
  constructor() {
    this.model = openai.embedding('text-embedding-3-small');
  }

  async generateEmbedding(text) {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      const { embedding } = await embed({
        model: this.model,
        value: text
      });

      logger.debug(`Generated embedding for text (${text.length} chars)`);
      return embedding;
    } catch (error) {
      logger.error('Embedding generation failed:', error);
      throw ApiError.internal('Failed to generate embedding', 'EMBEDDING_ERROR');
    }
  }

  async generateBatchEmbeddings(texts) {
    try {
      if (!texts || texts.length === 0) {
        return [];
      }

      // Filter empty texts
      const validTexts = texts.filter(t => t && t.trim().length > 0);

      if (validTexts.length === 0) {
        return [];
      }

      const { embeddings } = await embedMany({
        model: this.model,
        values: validTexts
      });

      logger.info(`Generated ${embeddings.length} embeddings in batch`);
      return embeddings;
    } catch (error) {
      logger.error('Batch embedding generation failed:', error);
      throw ApiError.internal('Failed to generate batch embeddings', 'BATCH_EMBEDDING_ERROR');
    }
  }
}

module.exports = new EmbeddingService();
```

---

### **E. ChromaDB Helper (`utils/chromaHelper.js`)**

**Purpose**: Simplified ChromaDB operations for PDF embeddings

**Functions**:
1. **`addEmbeddings(pdfId, chunks, embeddings)`** - Store chunks with embeddings
2. **`queryEmbeddings(queryEmbedding, pdfIds, limit)`** - Search similar chunks
3. **`deleteEmbeddings(pdfId)`** - Remove all embeddings for a PDF
4. **`getEmbeddingCount(pdfId)`** - Count embeddings for a PDF

**Implementation Pattern**:
```javascript
const { getCollection } = require('../config/chromadb');
const logger = require('./logger');
const ApiError = require('./apiError');

class ChromaHelper {
  async addEmbeddings(pdfId, chunks, embeddings) {
    try {
      const collection = await getCollection();
      
      if (!collection) {
        throw new Error('ChromaDB collection not initialized');
      }

      // Prepare data for ChromaDB
      const ids = chunks.map(chunk => `${pdfId}_chunk_${chunk.index}`);
      const documents = chunks.map(chunk => chunk.text);
      const metadatas = chunks.map(chunk => ({
        pdfId: pdfId.toString(),
        chunkIndex: chunk.index,
        startChar: chunk.startChar,
        endChar: chunk.endChar
      }));

      await collection.add({
        ids,
        embeddings,
        documents,
        metadatas
      });

      logger.info(`Added ${chunks.length} embeddings for PDF ${pdfId}`);
      
      return {
        count: chunks.length,
        pdfId
      };
    } catch (error) {
      logger.error('Failed to add embeddings to ChromaDB:', error);
      throw ApiError.internal('Failed to store embeddings', 'CHROMA_ADD_ERROR');
    }
  }

  async queryEmbeddings(queryEmbedding, pdfIds = null, limit = 5) {
    try {
      const collection = await getCollection();
      
      if (!collection) {
        throw new Error('ChromaDB collection not initialized');
      }

      const queryParams = {
        queryEmbeddings: [queryEmbedding],
        nResults: limit
      };

      // Filter by pdfIds if provided
      if (pdfIds && pdfIds.length > 0) {
        queryParams.where = {
          pdfId: { $in: pdfIds.map(id => id.toString()) }
        };
      }

      const results = await collection.query(queryParams);

      logger.debug(`Queried ChromaDB, found ${results.ids[0].length} results`);

      // Format results
      const formattedResults = results.ids[0].map((id, index) => ({
        id,
        document: results.documents[0][index],
        metadata: results.metadatas[0][index],
        distance: results.distances[0][index]
      }));

      return formattedResults;
    } catch (error) {
      logger.error('Failed to query ChromaDB:', error);
      throw ApiError.internal('Failed to query embeddings', 'CHROMA_QUERY_ERROR');
    }
  }

  async deleteEmbeddings(pdfId) {
    try {
      const collection = await getCollection();
      
      if (!collection) {
        throw new Error('ChromaDB collection not initialized');
      }

      await collection.delete({
        where: { pdfId: pdfId.toString() }
      });

      logger.info(`Deleted embeddings for PDF ${pdfId}`);
      
      return { success: true, pdfId };
    } catch (error) {
      logger.error('Failed to delete embeddings from ChromaDB:', error);
      throw ApiError.internal('Failed to delete embeddings', 'CHROMA_DELETE_ERROR');
    }
  }

  async getEmbeddingCount(pdfId) {
    try {
      const collection = await getCollection();
      
      if (!collection) {
        return 0;
      }

      const results = await collection.get({
        where: { pdfId: pdfId.toString() }
      });

      return results.ids.length;
    } catch (error) {
      logger.error('Failed to get embedding count:', error);
      return 0;
    }
  }
}

module.exports = new ChromaHelper();
```

---

### **F. File Storage Utility (`utils/fileStorage.js`)**

**Purpose**: File system operations for PDF storage

**Functions**:
1. **`deleteFile(filePath)`** - Delete file from filesystem
2. **`getFileSize(filePath)`** - Get file size in bytes
3. **`fileExists(filePath)`** - Check if file exists

**Implementation Pattern**:
```javascript
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const ApiError = require('./apiError');

const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`File deleted: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error('File deletion failed:', error);
    throw ApiError.internal('Failed to delete file', 'FILE_DELETE_ERROR');
  }
};

const getFileSize = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    logger.error('Failed to get file size:', error);
    return 0;
  }
};

const fileExists = (filePath) => {
  return fs.existsSync(filePath);
};

const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.info(`Directory created: ${dirPath}`);
  }
};

module.exports = {
  deleteFile,
  getFileSize,
  fileExists,
  ensureDirectoryExists
};
```

---

### **G. PDF Service (`services/pdfService.js`)**

**Purpose**: Business logic for PDF management

**Functions**:
1. **`uploadPDF(file, userId)`** - Handle PDF upload
2. **`getUserPDFs(userId, filters)`** - List user's PDFs
3. **`getPDFById(pdfId, userId)`** - Get single PDF
4. **`deletePDF(pdfId, userId)`** - Delete PDF and cleanup
5. **`updatePDFStatus(pdfId, status, error)`** - Update processing status

**Implementation Pattern**:
```javascript
const { PDF } = require('../models');
const { addPDFProcessingJob } = require('../queues/pdfProcessingQueue');
const { deleteFile } = require('../utils/fileStorage');
const chromaHelper = require('../utils/chromaHelper');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');

class PDFService {
  async uploadPDF(file, userId) {
    try {
      // Create PDF document
      const pdf = await PDF.create({
        userId,
        filename: file.filename,
        originalName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        status: 'uploading'
      });

      logger.info(`PDF uploaded: ${pdf._id} by user ${userId}`);

      // Add to processing queue
      const job = await addPDFProcessingJob({
        pdfId: pdf._id.toString(),
        userId: userId.toString(),
        filePath: file.path,
        fileSize: file.size
      });

      // Update PDF with job ID
      pdf.status = 'processing';
      await pdf.save();

      logger.info(`PDF processing job created: ${job.id} for PDF ${pdf._id}`);

      return {
        pdf,
        jobId: job.id
      };
    } catch (error) {
      logger.error('PDF upload failed:', error);
      
      // Cleanup file if PDF creation failed
      if (file && file.path) {
        deleteFile(file.path);
      }
      
      throw ApiError.internal('Failed to upload PDF', 'PDF_UPLOAD_ERROR');
    }
  }

  async getUserPDFs(userId, filters = {}) {
    try {
      const { status, limit = 50, skip = 0, sortBy = '-createdAt' } = filters;

      const query = { userId };
      
      if (status) {
        query.status = status;
      }

      const pdfs = await PDF.find(query)
        .sort(sortBy)
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .select('-__v');

      const total = await PDF.countDocuments(query);

      return {
        pdfs,
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      };
    } catch (error) {
      logger.error('Failed to get user PDFs:', error);
      throw ApiError.internal('Failed to retrieve PDFs', 'PDF_RETRIEVAL_ERROR');
    }
  }

  async getPDFById(pdfId, userId) {
    try {
      const pdf = await PDF.findOne({ _id: pdfId, userId });

      if (!pdf) {
        throw ApiError.notFound('PDF not found', 'PDF_NOT_FOUND');
      }

      return pdf;
    } catch (error) {
      if (error.name === 'CastError') {
        throw ApiError.badRequest('Invalid PDF ID', 'INVALID_PDF_ID');
      }
      throw error;
    }
  }

  async deletePDF(pdfId, userId) {
    try {
      const pdf = await this.getPDFById(pdfId, userId);

      // Delete file from filesystem
      if (pdf.filePath) {
        deleteFile(pdf.filePath);
      }

      // Delete embeddings from ChromaDB
      await chromaHelper.deleteEmbeddings(pdfId);

      // Delete PDF document
      await PDF.findByIdAndDelete(pdfId);

      logger.info(`PDF deleted: ${pdfId} by user ${userId}`);

      return {
        message: 'PDF deleted successfully',
        pdfId
      };
    } catch (error) {
      logger.error('PDF deletion failed:', error);
      throw error;
    }
  }

  async updatePDFStatus(pdfId, status, error = null) {
    try {
      const updateData = { status };
      
      if (error) {
        updateData.processingError = error;
      }

      const pdf = await PDF.findByIdAndUpdate(
        pdfId,
        updateData,
        { new: true }
      );

      if (!pdf) {
        throw ApiError.notFound('PDF not found', 'PDF_NOT_FOUND');
      }

      logger.info(`PDF ${pdfId} status updated to ${status}`);

      return pdf;
    } catch (error) {
      logger.error('PDF status update failed:', error);
      throw error;
    }
  }
}

module.exports = new PDFService();
```

---

### **H. Update PDF Processor Worker (`workers/pdfProcessor.js`)**

**Purpose**: Replace stub implementation with real PDF processing

**Flow**:
1. Update PDF status to "processing"
2. Parse PDF to extract text
3. Chunk text into segments
4. Generate embeddings for all chunks
5. Store embeddings in ChromaDB
6. Update PDF status to "ready"

**Implementation Pattern**:
```javascript
const { PDF } = require('../models');
const { parsePDF } = require('../utils/pdfParser');
const { chunkText, estimatePageNumber } = require('../utils/textChunker');
const embeddingService = require('../services/embeddingService');
const chromaHelper = require('../utils/chromaHelper');
const logger = require('../utils/logger');

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

      // Step 1: Parse PDF
      job.progress(20);
      logger.info(`PDF ${pdfId}: Parsing PDF`);
      const pdfData = await parsePDF(filePath);

      // Update page count
      await PDF.findByIdAndUpdate(pdfId, {
        pageCount: pdfData.numpages,
        'metadata.title': pdfData.info.Title,
        'metadata.author': pdfData.info.Author,
        'metadata.subject': pdfData.info.Subject,
        'metadata.keywords': pdfData.info.Keywords ? pdfData.info.Keywords.split(',').map(k => k.trim()) : []
      });

      job.progress(30);

      // Step 2: Chunk text
      logger.info(`PDF ${pdfId}: Chunking text`);
      const chunks = chunkText(pdfData.text);

      if (chunks.length === 0) {
        throw new Error('No text content found in PDF');
      }

      job.progress(40);
      logger.info(`PDF ${pdfId}: Created ${chunks.length} chunks`);

      // Step 3: Generate embeddings
      logger.info(`PDF ${pdfId}: Generating embeddings`);
      const chunkTexts = chunks.map(chunk => chunk.text);
      const embeddings = await embeddingService.generateBatchEmbeddings(chunkTexts);

      job.progress(70);
      logger.info(`PDF ${pdfId}: Generated ${embeddings.length} embeddings`);

      // Step 4: Store in ChromaDB
      logger.info(`PDF ${pdfId}: Storing embeddings in ChromaDB`);
      await chromaHelper.addEmbeddings(pdfId, chunks, embeddings);

      job.progress(90);

      // Step 5: Update PDF status to ready
      const updatedPDF = await PDF.findByIdAndUpdate(
        pdfId,
        {
          status: 'ready',
          'embeddingStats.totalChunks': chunks.length,
          'embeddingStats.embeddedChunks': embeddings.length,
          'embeddingStats.lastProcessedAt': new Date()
        },
        { new: true }
      );

      job.progress(100);
      logger.info(`PDF ${pdfId}: Processing completed successfully`);

      return {
        success: true,
        pdfId,
        chunksProcessed: chunks.length,
        pageCount: pdfData.numpages
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
}

module.exports = new PDFProcessor();
```

---

### **I. PDF Validator (`validators/pdfValidator.js`)**

**Purpose**: Joi validation schemas for PDF operations

**Schemas**:
1. **`uploadPDFSchema`** - Validate file upload (handled by Multer mostly)
2. **`getPDFsSchema`** - Validate list query parameters
3. **`deletePDFSchema`** - Validate PDF ID parameter

**Implementation Pattern**:
```javascript
const Joi = require('joi');

const getPDFsSchema = Joi.object({
  query: Joi.object({
    status: Joi.string().valid('uploading', 'processing', 'ready', 'failed'),
    limit: Joi.number().integer().min(1).max(100).default(50),
    skip: Joi.number().integer().min(0).default(0),
    sortBy: Joi.string().valid('createdAt', '-createdAt', 'originalName', '-originalName').default('-createdAt')
  })
});

const pdfIdSchema = Joi.object({
  params: Joi.object({
    pdfId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid PDF ID format'
    })
  })
});

module.exports = {
  getPDFsSchema,
  pdfIdSchema
};
```

---

### **J. PDF Controller (`controllers/pdfController.js`)**

**Purpose**: Handle HTTP requests for PDF operations

**Functions**:
1. **`uploadPDF(req, res)`** - Handle file upload
2. **`getUserPDFs(req, res)`** - List user's PDFs
3. **`getPDF(req, res)`** - Get single PDF details
4. **`deletePDF(req, res)`** - Delete PDF

**Implementation Pattern**:
```javascript
const pdfService = require('../services/pdfService');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');

class PDFController {
  uploadPDF = asyncHandler(async (req, res) => {
    if (!req.file) {
      throw ApiError.badRequest('No file uploaded', 'NO_FILE');
    }

    const result = await pdfService.uploadPDF(req.file, req.user.userId);

    return successResponse(
      res,
      201,
      'PDF uploaded successfully and processing started',
      result
    );
  });

  getUserPDFs = asyncHandler(async (req, res) => {
    const filters = {
      status: req.query.status,
      limit: req.query.limit,
      skip: req.query.skip,
      sortBy: req.query.sortBy
    };

    const result = await pdfService.getUserPDFs(req.user.userId, filters);

    return successResponse(
      res,
      200,
      'PDFs retrieved successfully',
      result
    );
  });

  getPDF = asyncHandler(async (req, res) => {
    const pdf = await pdfService.getPDFById(req.params.pdfId, req.user.userId);

    return successResponse(
      res,
      200,
      'PDF retrieved successfully',
      { pdf }
    );
  });

  deletePDF = asyncHandler(async (req, res) => {
    const result = await pdfService.deletePDF(req.params.pdfId, req.user.userId);

    return successResponse(
      res,
      200,
      'PDF deleted successfully',
      result
    );
  });
}

module.exports = new PDFController();
```

---

### **K. PDF Routes (`routes/pdfRoutes.js`)**

**Purpose**: Define PDF management API endpoints

**Routes**:

| Method | Endpoint | Middleware | Controller | Description |
|--------|----------|------------|------------|-------------|
| POST | `/pdfs/upload` | authenticate, multer | pdfController.uploadPDF | Upload PDF |
| GET | `/pdfs` | authenticate, validate | pdfController.getUserPDFs | List user's PDFs |
| GET | `/pdfs/:pdfId` | authenticate, validate | pdfController.getPDF | Get PDF details |
| DELETE | `/pdfs/:pdfId` | authenticate, validate | pdfController.deletePDF | Delete PDF |

**Implementation Pattern**:
```javascript
```javascript
const express = require('express');
const pdfController = require('../controllers/pdfController');
const authenticate = require('../middlewares/authenticate');
const upload = require('../config/multer');
const validate = require('../middlewares/requestValidator');
const { getPDFsSchema, pdfIdSchema } = require('../validators/pdfValidator');

const router = express.Router();

// All PDF routes require authentication
router.use(authenticate);

// Upload PDF
router.post('/pdfs/upload', upload.single('file'), pdfController.uploadPDF);

// Get user's PDFs
router.get('/pdfs', validate(getPDFsSchema), pdfController.getUserPDFs);

// Get single PDF
router.get('/pdfs/:pdfId', validate(pdfIdSchema), pdfController.getPDF);

// Delete PDF
router.delete('/pdfs/:pdfId', validate(pdfIdSchema), pdfController.deletePDF);

module.exports = router;
```

---

### **L. Update App.js to Include PDF Routes**

**Add to `src/app.js`** (after job routes):

```javascript
const pdfRoutes = require('./routes/pdfRoutes');

app.use('/api', pdfRoutes);
```

---

### **M. Update Environment Configuration**

**Add to `src/config/env.js`**:
```javascript
fileUploadPath: process.env.FILE_UPLOAD_PATH || './uploads',
maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 52428800,
llmApiKey: process.env.LLM_API_KEY,
```

**Add to `.env.example`**:
```env
# File Upload
FILE_UPLOAD_PATH=./uploads
MAX_FILE_SIZE=52428800

# LLM Configuration (for embeddings)
LLM_API_KEY=your-openai-api-key-here
```

---

## 5. API Request/Response Examples

### **Upload PDF**
```bash
POST /api/pdfs/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: [PDF file]
```

**Response (201)**:
```json
{
  "success": true,
  "message": "PDF uploaded successfully and processing started",
  "data": {
    "pdf": {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "507f1f77bcf86cd799439012",
      "filename": "1696598400000-uuid-document.pdf",
      "originalName": "document.pdf",
      "filePath": "./uploads/1696598400000-uuid-document.pdf",
      "fileSize": 2048576,
      "status": "processing",
      "createdAt": "2025-10-07T10:00:00.000Z"
    },
    "jobId": "1"
  },
  "timestamp": "2025-10-07T10:00:00.000Z"
}
```

### **Get User's PDFs**
```bash
GET /api/pdfs?status=ready&limit=10&skip=0
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "PDFs retrieved successfully",
  "data": {
    "pdfs": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "userId": "507f1f77bcf86cd799439012",
        "filename": "1696598400000-uuid-document.pdf",
        "originalName": "Physics Chapter 1.pdf",
        "fileSize": 2048576,
        "pageCount": 15,
        "status": "ready",
        "metadata": {
          "title": "Physical World",
          "author": "NCERT",
          "subject": "Physics"
        },
        "embeddingStats": {
          "totalChunks": 50,
          "embeddedChunks": 50,
          "lastProcessedAt": "2025-10-07T10:05:00.000Z"
        },
        "createdAt": "2025-10-07T10:00:00.000Z"
      }
    ],
    "total": 1,
    "limit": 10,
    "skip": 0
  },
  "timestamp": "2025-10-07T10:10:00.000Z"
}
```

### **Get Single PDF**
```bash
GET /api/pdfs/507f1f77bcf86cd799439011
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "PDF retrieved successfully",
  "data": {
    "pdf": {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "507f1f77bcf86cd799439012",
      "filename": "1696598400000-uuid-document.pdf",
      "originalName": "Physics Chapter 1.pdf",
      "filePath": "./uploads/1696598400000-uuid-document.pdf",
      "fileSize": 2048576,
      "pageCount": 15,
      "status": "ready",
      "metadata": {
        "title": "Physical World",
        "author": "NCERT",
        "subject": "Physics",
        "keywords": ["physics", "science"]
      },
      "embeddingStats": {
        "totalChunks": 50,
        "embeddedChunks": 50,
        "lastProcessedAt": "2025-10-07T10:05:00.000Z"
      },
      "createdAt": "2025-10-07T10:00:00.000Z",
      "updatedAt": "2025-10-07T10:05:00.000Z"
    }
  },
  "timestamp": "2025-10-07T10:10:00.000Z"
}
```

### **Delete PDF**
```bash
DELETE /api/pdfs/507f1f77bcf86cd799439011
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "PDF deleted successfully",
  "data": {
    "message": "PDF deleted successfully",
    "pdfId": "507f1f77bcf86cd799439011"
  },
  "timestamp": "2025-10-07T10:15:00.000Z"
}
```

---

## 6. Error Responses

### **No File Uploaded**
```json
{
  "success": false,
  "message": "No file uploaded",
  "error": {
    "code": "NO_FILE"
  },
  "timestamp": "2025-10-07T10:00:00.000Z"
}
```

### **Invalid File Type**
```json
{
  "success": false,
  "message": "Only PDF files are allowed",
  "error": {
    "code": "INVALID_FILE_TYPE"
  },
  "timestamp": "2025-10-07T10:00:00.000Z"
}
```

### **File Too Large**
```json
{
  "success": false,
  "message": "File too large",
  "error": {
    "code": "FILE_TOO_LARGE"
  },
  "timestamp": "2025-10-07T10:00:00.000Z"
}
```

### **PDF Not Found**
```json
{
  "success": false,
  "message": "PDF not found",
  "error": {
    "code": "PDF_NOT_FOUND"
  },
  "timestamp": "2025-10-07T10:00:00.000Z"
}
```

---

## 7. Text Chunking Strategy

**Why Chunking?**
- Embedding models have token limits
- Smaller chunks = more precise retrieval
- Overlap preserves context across boundaries

**Strategy**:
```
Text: "Sentence 1. Sentence 2. Sentence 3. Sentence 4. Sentence 5."

Chunk 1: "Sentence 1. Sentence 2. Sentence 3."     [0-800 chars]
Chunk 2: "Sentence 2. Sentence 3. Sentence 4."     [600-1400 chars] ← overlap
Chunk 3: "Sentence 3. Sentence 4. Sentence 5."     [1200-2000 chars] ← overlap
```

**Benefits**:
- Context preservation at boundaries
- Better retrieval accuracy
- Handles sentence-spanning concepts

---

## 8. Testing Checklist

After implementation:

- [ ] Install dependencies successfully
- [ ] ChromaDB is running and accessible
- [ ] Upload directory exists and is writable
- [ ] Can upload PDF file via API
- [ ] File is stored in uploads directory
- [ ] PDF processing job is created
- [ ] Worker processes PDF asynchronously
- [ ] Text is extracted from PDF
- [ ] Text is chunked correctly
- [ ] Embeddings are generated
- [ ] Embeddings are stored in ChromaDB
- [ ] PDF status updates to "ready"
- [ ] Can list user's PDFs
- [ ] Can retrieve single PDF
- [ ] Can delete PDF (file + embeddings removed)
- [ ] Error handling works for invalid files

---