# Module 6: RAG & Chat Service - Low-Level Design (LLD)

---

## 1. Module Overview

**Purpose**: Implement Retrieval-Augmented Generation (RAG) for intelligent question-answering with PDF context and citation support.

**Responsibilities**:
- Chat session management (create, retrieve, list, delete)
- Message storage with conversation history
- Query embedding generation
- Vector similarity search in ChromaDB
- Context retrieval from PDFs
- LLM integration using Hugging Face API
- Citation extraction with page numbers and snippets
- Streaming response support
- Multi-PDF context handling

**Success Criteria**:
- Users can create and manage chat sessions
- Queries retrieve relevant PDF chunks from ChromaDB
- LLM generates contextual answers using retrieved chunks
- Responses include citations (page numbers, text snippets)
- Chat history is persisted and retrievable
- Support for streaming responses
- Multiple PDFs can be queried in single session

---

## 2. Directory Structure

```
backend/
├── src/
│   ├── config/
│   │   └── llm.js                      # Hugging Face LLM configuration
│   │
│   ├── services/
│   │   ├── chatService.js              # Chat business logic
│   │   ├── ragService.js               # RAG pipeline logic
│   │   └── llmService.js               # Hugging Face API integration
│   │
│   ├── controllers/
│   │   └── chatController.js           # Chat route handlers
│   │
│   ├── routes/
│   │   └── chatRoutes.js               # Chat API routes
│   │
│   ├── utils/
│   │   └── citationExtractor.js        # Extract citations from context
│   │
│   └── validators/
│       └── chatValidator.js            # Chat validation schemas
```

---

## 3. Technology Stack for Module 6

**New Dependencies**:
```json
{
  "@huggingface/inference": "^2.6.4"
}
```

**Hugging Face Models**:
- **Embeddings**: `sentence-transformers/all-MiniLM-L6-v2` (already using OpenAI from Module 5)
- **LLM**: `mistralai/Mistral-7B-Instruct-v0.2` (or any compatible model)

**Note**: We'll keep OpenAI embeddings from Module 5 for consistency, but use Hugging Face for LLM inference.

---

## 4. Detailed Component Design

### **A. LLM Configuration (`config/llm.js`)**

**Purpose**: Configure Hugging Face API client

**Configuration**:
```javascript
{
  apiKey: process.env.HUGGINGFACE_API_KEY,
  model: process.env.HUGGINGFACE_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2',
  temperature: 0.7,
  maxTokens: 1024,
  topP: 0.9
}
```

**Implementation Pattern**:
```javascript
const { HfInference } = require('@huggingface/inference');
const config = require('./env');
const logger = require('../utils/logger');

class LLMConfig {
  constructor() {
    if (!config.huggingfaceApiKey) {
      logger.warn('Hugging Face API key not configured');
      this.client = null;
      return;
    }

    this.client = new HfInference(config.huggingfaceApiKey);
    this.model = config.huggingfaceModel || 'mistralai/Mistral-7B-Instruct-v0.2';
    this.defaultParams = {
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 0.9
    };

    logger.info(`LLM configured with model: ${this.model}`);
  }

  getClient() {
    if (!this.client) {
      throw new Error('Hugging Face client not initialized');
    }
    return this.client;
  }

  getModel() {
    return this.model;
  }

  getDefaultParams() {
    return { ...this.defaultParams };
  }
}

module.exports = new LLMConfig();
```

---

### **B. LLM Service (`services/llmService.js`)**

**Purpose**: Handle LLM API calls with Hugging Face

**Functions**:
1. **`generateResponse(prompt, options)`** - Generate text response
2. **`generateStreamingResponse(prompt, options)`** - Stream response chunks
3. **`buildRAGPrompt(query, context, chatHistory)`** - Construct prompt with context

**Prompt Template**:
```
You are a helpful AI assistant. Answer the user's question based on the provided context from PDF documents.

Context from PDFs:
[Context chunks with page numbers]

Chat History:
[Previous messages]

User Question: {query}

Instructions:
- Answer based primarily on the provided context
- If the context doesn't contain the answer, say so
- Include page references when citing information (e.g., "According to page 5...")
- Be concise but comprehensive

Answer:
```

**Implementation Pattern**:
```javascript
const llmConfig = require('../config/llm');
const logger = require('../utils/logger');
const ApiError = require('../utils/apiError');

class LLMService {
  constructor() {
    this.client = null;
    this.model = null;
    
    try {
      this.client = llmConfig.getClient();
      this.model = llmConfig.getModel();
    } catch (error) {
      logger.warn('LLM service initialized without client');
    }
  }

  buildRAGPrompt(query, contextChunks, chatHistory = []) {
    let prompt = "You are a helpful AI assistant. Answer the user's question based on the provided context from PDF documents.\n\n";

    // Add context
    if (contextChunks && contextChunks.length > 0) {
      prompt += "Context from PDFs:\n";
      contextChunks.forEach((chunk, index) => {
        const pageNum = chunk.metadata?.pageNumber || 'unknown';
        prompt += `[Context ${index + 1}, Page ${pageNum}]\n${chunk.document}\n\n`;
      });
    }

    // Add chat history (last 3 exchanges for context)
    if (chatHistory.length > 0) {
      prompt += "Chat History:\n";
      const recentHistory = chatHistory.slice(-6); // Last 3 Q&A pairs
      recentHistory.forEach(msg => {
        prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
      prompt += "\n";
    }

    // Add current question
    prompt += `User Question: ${query}\n\n`;

    // Add instructions
    prompt += `Instructions:
- Answer based primarily on the provided context
- If the context doesn't contain the answer, say so clearly
- Include page references when citing information (e.g., "According to page 5...")
- Be concise but comprehensive
- If asked about something not in the context, acknowledge the limitation

Answer:`;

    return prompt;
  }

  async generateResponse(prompt, options = {}) {
    try {
      if (!this.client) {
        throw new Error('LLM client not initialized');
      }

      const params = {
        ...llmConfig.getDefaultParams(),
        ...options
      };

      const response = await this.client.textGeneration({
        model: this.model,
        inputs: prompt,
        parameters: {
          temperature: params.temperature,
          max_new_tokens: params.max_tokens,
          top_p: params.top_p,
          return_full_text: false
        }
      });

      logger.debug(`LLM response generated (${response.generated_text.length} chars)`);

      return response.generated_text.trim();
    } catch (error) {
      logger.error('LLM generation failed:', error);
      throw ApiError.internal('Failed to generate response', 'LLM_GENERATION_ERROR');
    }
  }

  async *generateStreamingResponse(prompt, options = {}) {
    try {
      if (!this.client) {
        throw new Error('LLM client not initialized');
      }

      const params = {
        ...llmConfig.getDefaultParams(),
        ...options
      };

      const stream = await this.client.textGenerationStream({
        model: this.model,
        inputs: prompt,
        parameters: {
          temperature: params.temperature,
          max_new_tokens: params.max_tokens,
          top_p: params.top_p,
          return_full_text: false
        }
      });

      for await (const chunk of stream) {
        if (chunk.token.text) {
          yield chunk.token.text;
        }
      }
    } catch (error) {
      logger.error('LLM streaming failed:', error);
      throw ApiError.internal('Failed to stream response', 'LLM_STREAMING_ERROR');
    }
  }
}

module.exports = new LLMService();
```

---

### **C. RAG Service (`services/ragService.js`)**

**Purpose**: Implement RAG pipeline (retrieve + generate)

**RAG Pipeline**:
1. Generate embedding for user query
2. Search ChromaDB for similar chunks
3. Retrieve relevant PDF chunks
4. Build context with citations
5. Generate LLM response with context
6. Extract citations from response

**Functions**:
1. **`processQuery(query, pdfIds, chatHistory, options)`** - Complete RAG pipeline
2. **`retrieveContext(query, pdfIds, limit)`** - Get relevant chunks from ChromaDB
3. **`enrichContextWithPageNumbers(chunks, pdfIds)`** - Add page number estimates

**Implementation Pattern**:
```javascript
const embeddingService = require('./embeddingService');
const llmService = require('./llmService');
const chromaHelper = require('../utils/chromaHelper');
const { estimatePageNumber } = require('../utils/textChunker');
const { extractCitations } = require('../utils/citationExtractor');
const { PDF } = require('../models');
const logger = require('../utils/logger');
const ApiError = require('../utils/apiError');

class RAGService {
  async processQuery(query, pdfIds = null, chatHistory = [], options = {}) {
    try {
      const { streaming = false, contextLimit = 5 } = options;

      logger.info(`Processing RAG query: "${query.substring(0, 50)}..."`);

      // Step 1: Retrieve context
      const contextChunks = await this.retrieveContext(query, pdfIds, contextLimit);

      if (contextChunks.length === 0) {
        logger.warn('No relevant context found for query');
        return {
          answer: "I couldn't find relevant information in the uploaded PDFs to answer your question. Please make sure the PDFs contain information related to your query.",
          citations: [],
          contextChunks: []
        };
      }

      logger.info(`Retrieved ${contextChunks.length} context chunks`);

      // Step 2: Enrich context with page numbers
      const enrichedContext = await this.enrichContextWithPageNumbers(contextChunks, pdfIds);

      // Step 3: Build prompt
      const prompt = llmService.buildRAGPrompt(query, enrichedContext, chatHistory);

      // Step 4: Generate response
      let answer;
      if (streaming) {
        // Return generator for streaming
        return {
          stream: llmService.generateStreamingResponse(prompt),
          contextChunks: enrichedContext
        };
      } else {
        answer = await llmService.generateResponse(prompt);
      }

      // Step 5: Extract citations
      const citations = extractCitations(answer, enrichedContext);

      logger.info(`RAG query processed successfully with ${citations.length} citations`);

      return {
        answer,
        citations,
        contextChunks: enrichedContext
      };
    } catch (error) {
      logger.error('RAG processing failed:', error);
      throw error;
    }
  }

  async retrieveContext(query, pdfIds, limit = 5) {
    try {
      // Generate query embedding
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      // Search ChromaDB
      const results = await chromaHelper.queryEmbeddings(
        queryEmbedding,
        pdfIds,
        limit
      );

      return results;
    } catch (error) {
      logger.error('Context retrieval failed:', error);
      throw ApiError.internal('Failed to retrieve context', 'CONTEXT_RETRIEVAL_ERROR');
    }
  }

  async enrichContextWithPageNumbers(chunks, pdfIds) {
    try {
      // Get PDF documents to calculate page numbers
      const pdfMap = {};
      
      if (pdfIds && pdfIds.length > 0) {
        const pdfs = await PDF.find({ _id: { $in: pdfIds } }).select('_id pageCount');
        pdfs.forEach(pdf => {
          pdfMap[pdf._id.toString()] = pdf;
        });
      }

      // Enrich each chunk with estimated page number
      const enrichedChunks = chunks.map(chunk => {
        const pdfId = chunk.metadata.pdfId;
        const pdf = pdfMap[pdfId];
        
        let pageNumber = 1;
        if (pdf && chunk.metadata.startChar) {
          // Estimate page based on character position
          // This is approximate - real page numbers would need PDF parsing
          const charsPerPage = 2000; // Average characters per page
          pageNumber = Math.ceil(chunk.metadata.startChar / charsPerPage);
          pageNumber = Math.min(pageNumber, pdf.pageCount);
        }

        return {
          ...chunk,
          metadata: {
            ...chunk.metadata,
            pageNumber
          }
        };
      });

      return enrichedChunks;
    } catch (error) {
      logger.error('Context enrichment failed:', error);
      // Return chunks without page numbers if enrichment fails
      return chunks;
    }
  }
}

module.exports = new RAGService();
```

---

### **D. Citation Extractor (`utils/citationExtractor.js`)**

**Purpose**: Extract citations from LLM response

**Strategy**:
- Look for page references in response ("page 5", "on page 3")
- Match with context chunks
- Extract relevant snippets

**Function**:
- `extractCitations(response, contextChunks)` - Find citations in response

**Implementation Pattern**:
```javascript
const logger = require('./logger');

const extractCitations = (response, contextChunks) => {
  const citations = [];

  if (!response || !contextChunks || contextChunks.length === 0) {
    return citations;
  }

  // Pattern to match page references: "page X", "Page X", "p. X", "pg. X"
  const pagePattern = /(?:page|Page|p\.|pg\.)\s*(\d+)/g;
  const matches = [...response.matchAll(pagePattern)];

  const referencedPages = new Set(matches.map(m => parseInt(m[1])));

  // Create citations from context chunks that match referenced pages
  contextChunks.forEach((chunk, index) => {
    const pageNum = chunk.metadata?.pageNumber;
    
    if (pageNum && referencedPages.has(pageNum)) {
      // Extract a snippet (first 150 chars)
      const snippet = chunk.document.substring(0, 150).trim() + '...';

      citations.push({
        pdfId: chunk.metadata.pdfId,
        pageNumber: pageNum,
        snippet,
        chunkIndex: chunk.metadata.chunkIndex
      });
    }
  });

  // If no specific page references found, include first chunk as general citation
  if (citations.length === 0 && contextChunks.length > 0) {
    const firstChunk = contextChunks[0];
    const snippet = firstChunk.document.substring(0, 150).trim() + '...';

    citations.push({
      pdfId: firstChunk.metadata.pdfId,
      pageNumber: firstChunk.metadata?.pageNumber || 1,
      snippet,
      chunkIndex: firstChunk.metadata.chunkIndex
    });
  }

  logger.debug(`Extracted ${citations.length} citations from response`);

  return citations;
};

module.exports = {
  extractCitations
};
```

---

### **E. Chat Service (`services/chatService.js`)**

**Purpose**: Manage chat sessions and messages

**Functions**:
1. **`createChat(userId, title, pdfIds)`** - Create new chat session
2. **`getUserChats(userId, filters)`** - List user's chats
3. **`getChatById(chatId, userId)`** - Get single chat with history
4. **`addMessage(chatId, userId, role, content, citations)`** - Add message to chat
5. **`deleteChat(chatId, userId)`** - Delete chat session
6. **`updateChatTitle(chatId, userId, title)`** - Update chat title

**Implementation Pattern**:
```javascript
const { Chat } = require('../models');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');

class ChatService {
  async createChat(userId, title = 'New Chat', pdfIds = []) {
    try {
      const chat = await Chat.create({
        userId,
        title,
        pdfIds,
        messages: []
      });

      logger.info(`Chat created: ${chat._id} by user ${userId}`);

      return chat;
    } catch (error) {
      logger.error('Chat creation failed:', error);
      throw ApiError.internal('Failed to create chat', 'CHAT_CREATE_ERROR');
    }
  }

  async getUserChats(userId, filters = {}) {
    try {
      const { limit = 50, skip = 0, sortBy = '-updatedAt' } = filters;

      const chats = await Chat.find({ userId })
        .sort(sortBy)
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .select('-messages') // Don't include full message history in list
        .populate('pdfIds', 'originalName pageCount status');

      const total = await Chat.countDocuments({ userId });

      return {
        chats,
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      };
    } catch (error) {
      logger.error('Failed to get user chats:', error);
      throw ApiError.internal('Failed to retrieve chats', 'CHAT_RETRIEVAL_ERROR');
    }
  }

  async getChatById(chatId, userId) {
    try {
      const chat = await Chat.findOne({ _id: chatId, userId })
        .populate('pdfIds', 'originalName pageCount status metadata');

      if (!chat) {
        throw ApiError.notFound('Chat not found', 'CHAT_NOT_FOUND');
      }

      return chat;
    } catch (error) {
      if (error.name === 'CastError') {
        throw ApiError.badRequest('Invalid chat ID', 'INVALID_CHAT_ID');
      }
      throw error;
    }
  }

  async addMessage(chatId, userId, role, content, citations = []) {
    try {
      const chat = await Chat.findOne({ _id: chatId, userId });

      if (!chat) {
        throw ApiError.notFound('Chat not found', 'CHAT_NOT_FOUND');
      }

      await chat.addMessage(role, content, citations);

      logger.info(`Message added to chat ${chatId} by ${role}`);

      return chat;
    } catch (error) {
      logger.error('Failed to add message:', error);
      throw error;
    }
  }

  async deleteChat(chatId, userId) {
    try {
      const chat = await Chat.findOneAndDelete({ _id: chatId, userId });

      if (!chat) {
        throw ApiError.notFound('Chat not found', 'CHAT_NOT_FOUND');
      }

      logger.info(`Chat deleted: ${chatId} by user ${userId}`);

      return {
        message: 'Chat deleted successfully',
        chatId
      };
    } catch (error) {
      logger.error('Chat deletion failed:', error);
      throw error;
    }
  }

  async updateChatTitle(chatId, userId, title) {
    try {
      const chat = await Chat.findOneAndUpdate(
        { _id: chatId, userId },
        { title },
        { new: true }
      );

      if (!chat) {
        throw ApiError.notFound('Chat not found', 'CHAT_NOT_FOUND');
      }

      logger.info(`Chat title updated: ${chatId}`);

      return chat;
    } catch (error) {
      logger.error('Chat title update failed:', error);
      throw error;
    }
  }
}

module.exports = new ChatService();
```

---

### **F. Chat Validator (`validators/chatValidator.js`)**

**Purpose**: Joi validation schemas for chat operations

**Schemas**:
1. **`createChatSchema`** - Validate chat creation
2. **`sendMessageSchema`** - Validate message sending
3. **`getChatsSchema`** - Validate list parameters
4. **`chatIdSchema`** - Validate chat ID

**Implementation Pattern**:
```javascript
const Joi = require('joi');

const createChatSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().trim().max(100).default('New Chat'),
    pdfIds: Joi.array().items(
      Joi.string().regex(/^[0-9a-fA-F]{24}$/)
    ).default([])
  })
});

const sendMessageSchema = Joi.object({
  body: Joi.object({
    message: Joi.string().trim().required().min(1).max(5000).messages({
      'any.required': 'Message is required',
      'string.empty': 'Message cannot be empty',
      'string.max': 'Message cannot exceed 5000 characters'
    }),
    streaming: Joi.boolean().default(false)
  }),
  params: Joi.object({
    chatId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  })
});

const getChatsSchema = Joi.object({
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50),
    skip: Joi.number().integer().min(0).default(0),
    sortBy: Joi.string().valid('createdAt', '-createdAt', 'updatedAt', '-updatedAt').default('-updatedAt')
  })
});

const chatIdSchema = Joi.object({
  params: Joi.object({
    chatId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid chat ID format'
    })
  })
});

const updateChatTitleSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().trim().required().min(1).max(100).messages({
      'any.required': 'Title is required',
      'string.empty': 'Title cannot be empty',
      'string.max': 'Title cannot exceed 100 characters'
    })
  }),
  params: Joi.object({
    chatId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  })
});

module.exports = {
  createChatSchema,
  sendMessageSchema,
  getChatsSchema,
  chatIdSchema,
  updateChatTitleSchema
};
```

---

### **G. Chat Controller (`controllers/chatController.js`)**

**Purpose**: Handle HTTP requests for chat operations

**Functions**:
1. **`createChat(req, res)`** - Create new chat
2. **`getUserChats(req, res)`** - List user's chats
3. **`getChat(req, res)`** - Get chat with history
4. **`sendMessage(req, res)`** - Send message and get AI response
5. **`deleteChat(req, res)`** - Delete chat
6. **`updateChatTitle(req, res)`** - Update chat title

**Implementation Pattern**:
```javascript
const chatService = require('../services/chatService');
const ragService = require('../services/ragService');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');

class ChatController {
  createChat = asyncHandler(async (req, res) => {
    const { title, pdfIds } = req.body;

    const chat = await chatService.createChat(req.user.userId, title, pdfIds);

    return successResponse(
      res,
      201,
      'Chat created successfully',
      { chat }
    );
  });

  getUserChats = asyncHandler(async (req, res) => {
    const filters = {
      limit: req.query.limit,
      skip: req.query.skip,
      sortBy: req.query.sortBy
    };

    const result = await chatService.getUserChats(req.user.userId, filters);

    return successResponse(
      res,
      200,
      'Chats retrieved successfully',
      result
    );
  });

  getChat = asyncHandler(async (req, res) => {
    const chat = await chatService.getChatById(req.params.chatId, req.user.userId);

    return successResponse(
      res,
      200,
      'Chat retrieved successfully',
      { chat }
    );
  });

  sendMessage = asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    const { message, streaming } = req.body;

    // Get chat
    const chat = await chatService.getChatById(chatId, req.user.userId);

    // Add user message to chat
    await chatService.addMessage(chatId, req.user.userId, 'user', message);

    // Process query with RAG
    const result = await ragService.processQuery(
      message,
      chat.pdfIds.map(pdf => pdf._id),
      chat.messages,
      { streaming }
    );

    // Handle streaming response
    if (streaming && result.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullResponse = '';

      try {
        for await (const chunk of result.stream) {
          fullResponse += chunk;
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }

        // Save assistant message after streaming complete
        await chatService.addMessage(
          chatId,
          req.user.userId,
          'assistant',
          fullResponse,
          [] // Citations extracted separately
        );

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      } catch (error) {
        logger.error('Streaming error:', error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }

      return;
    }

    // Non-streaming response
    // Add assistant message to chat
    await chatService.addMessage(
      chatId,
      req.user.userId,
      'assistant',
      result.answer,
      result.citations
    );

    return successResponse(
      res,
      200,
      'Message sent successfully',
      {
        answer: result.answer,
        citations: result.citations
      }
    );
  });

  deleteChat = asyncHandler(async (req, res) => {
    const result = await chatService.deleteChat(req.params.chatId, req.user.userId);

    return successResponse(
      res,
      200,
      'Chat deleted successfully',
      result
    );
  });

  updateChatTitle = asyncHandler(async (req, res) => {
    const chat = await chatService.updateChatTitle(
      req.params.chatId,
      req.user.userId,
      req.body.title
    );

    return successResponse(
      res,
      200,
      'Chat title updated successfully',
      { chat }
    );
  });
}

module.exports = new ChatController();
```

---

### **H. Chat Routes (`routes/chatRoutes.js`)**

**Purpose**: Define chat API endpoints

**Routes**:

| Method | Endpoint | Middleware | Controller | Description |
|--------|----------|------------|------------|-------------|
| POST | `/chats` | authenticate, validate | chatController.createChat | Create chat |
| GET | `/chats` | authenticate, validate | chatController.getUserChats | List chats |
| GET | `/chats/:chatId` | authenticate, validate | chatController.getChat | Get chat |
| POST | `/chats/:chatId/messages` | authenticate, validate | chatController.sendMessage | Send message |
| DELETE | `/chats/:chatId` | authenticate, validate | chatController.deleteChat | Delete chat |
| PUT | `/chats/:chatId/title` | authenticate, validate | chatController.updateChatTitle | Update title |

**Implementation Pattern**:
```javascript
const express = require('express');
const chatController = require('../controllers/chatController');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/requestValidator');
const {
  createChatSchema,
  sendMessageSchema,
  getChatsSchema,
  chatIdSchema,
  updateChatTitleSchema
} = require('../validators/chatValidator');

const router = express.Router();

// All chat routes require authentication
router.use(authenticate);

// Chat management
router.post('/chats', validate(createChatSchema), chatController.createChat);
router.get('/chats', validate(getChatsSchema), chatController.getUserChats);
router.get('/chats/:chatId', validate(chatIdSchema), chatController.getChat);
router.delete('/chats/:chatId', validate(chatIdSchema), chatController.deleteChat);
router.put('/chats/:chatId/title', validate(updateChatTitleSchema), chatController.updateChatTitle);

// Messaging
router.post('/chats/:chatId/messages', validate(sendMessageSchema), chatController.sendMessage);

module.exports = router;
```

---

### **I. Update Environment Configuration**

**Add to `src/config/env.js`**:
```javascript
huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY,
huggingfaceModel: process.env.HUGGINGFACE_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2',
```

**Add to `.env.example`**:
```env
# Hugging Face Configuration
HUGGINGFACE_API_KEY=your-huggingface-api-key-here
HUGGINGFACE_MODEL=mistralai/Mistral-7B-Instruct-v0.2
```

---

### **J. Update App.js to Include Chat Routes**

**Add to `src/app.js`** (after PDF routes):

```javascript
const chatRoutes = require('./routes/chatRoutes');

app.use('/api', chatRoutes);
```

---

## 5. RAG Pipeline Flow

```
User Query: "Explain Newton's laws"
    ↓
1. Generate query embedding (OpenAI)
    ↓
2. Search ChromaDB for similar chunks (top 5)
    ↓
3. Retrieve chunks with metadata
    ↓
4. Enrich chunks with page numbers
    ↓
5. Build RAG prompt with context + chat history
    ↓
6. Send to Hugging Face LLM (Mistral-7B)
    ↓
7. Generate response
    ↓
8. Extract citations (page references)
    ↓
9. Save messages to database
    ↓
10. Return response with citations to user
```

---

## 6. API Request/Response Examples

### **Create Chat**
```bash
POST /api/chats
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Physics Questions",
  "pdfIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
}
```

**Response (201)**:
```json
{
  "success": true,
  "message": "Chat created successfully",
  "data": {
    "chat": {
      "_id": "507f1f77bcf86cd799439020",
      "userId": "507f1f77bcf86cd799439013",
      "title": "Physics Questions",
      "pdfIds": [
        {
          "_id": "507f1f77bcf86cd799439011",
          "originalName": "Physics Chapter 1.pdf",
          "pageCount": 15,
          "status": "ready"
        }
      ],
      "messages": [],
      "createdAt": "2025-10-07T10:00:00.000Z",
      "updatedAt": "2025-10-07T10:00:00.000Z"
    }
  },
  "timestamp": "2025-10-07T10:00:00.000Z"
}
```

### **Send Message (Non-streaming)**
```bash
POST /api/chats/507f1f77bcf86cd799439020/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Explain Newton's first law of motion",
  "streaming": false
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "answer": "According to page 5, Newton's first law of motion states that an object at rest stays at rest and an object in motion stays in motion with the same speed and in the same direction unless acted upon by an unbalanced force. This is also known as the law of inertia. For example, a book on a table will remain at rest until someone picks it up, and a moving car will continue moving until friction or brakes stop it.",
    "citations": [
      {
        "pdfId": "507f1f77bcf86cd799439011",
        "pageNumber": 5,
        "snippet": "Newton's first law of motion states that an object at rest stays at rest and an object in motion stays in motion with the same speed...",
        "chunkIndex": 12
      }
    ]
  },
  "timestamp": "2025-10-07T10:05:00.000Z"
}
```

### **Send Message (Streaming)**
```bash
POST /api/chats/507f1f77bcf86cd799439020/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "What is inertia?",
  "streaming": true
}
```

**Response (SSE Stream)**:
```
data: {"chunk":"According"}

data: {"chunk":" to"}

data: {"chunk":" page"}

data: {"chunk":" 5"}

data: {"chunk":","}

data: {"chunk":" inertia"}

...

data: {"done":true}
```

### **Get User's Chats**
```bash
GET /api/chats?limit=10&skip=0
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Chats retrieved successfully",
  "data": {
    "chats": [
      {
        "_id": "507f1f77bcf86cd799439020",
        "userId": "507f1f77bcf86cd799439013",
        "title": "Physics Questions",
        "pdfIds": [
          {
            "_id": "507f1f77bcf86cd799439011",
            "originalName": "Physics Chapter 1.pdf",
            "pageCount": 15,
            "status": "ready"
          }
        ],
        "createdAt": "2025-10-07T10:00:00.000Z",
        "updatedAt": "2025-10-07T10:05:00.000Z"
      }
    ],
    "total": 1,
    "limit": 10,
    "skip": 0
  },
  "timestamp": "2025-10-07T10:10:00.000Z"
}
```

### **Get Single Chat with History**
```bash
GET /api/chats/507f1f77bcf86cd799439020
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Chat retrieved successfully",
  "data": {
    "chat": {
      "_id": "507f1f77bcf86cd799439020",
      "userId": "507f1f77bcf86cd799439013",
      "title": "Physics Questions",
      "pdfIds": [
        {
          "_id": "507f1f77bcf86cd799439011",
          "originalName": "Physics Chapter 1.pdf",
          "pageCount": 15,
          "status": "ready",
          "metadata": {
            "title": "Physical World",
            "author": "NCERT"
          }
        }
      ],
      "messages": [
        {
          "role": "user",
          "content": "Explain Newton's first law of motion",
          "timestamp": "2025-10-07T10:05:00.000Z"
        },
        {
          "role": "assistant",
          "content": "According to page 5, Newton's first law...",
          "citations": [
            {
              "pdfId": "507f1f77bcf86cd799439011",
              "pageNumber": 5,
              "snippet": "Newton's first law of motion states..."
            }
          ],
          "timestamp": "2025-10-07T10:05:05.000Z"
        }
      ],
      "createdAt": "2025-10-07T10:00:00.000Z",
      "updatedAt": "2025-10-07T10:05:05.000Z"
    }
  },
  "timestamp": "2025-10-07T10:10:00.000Z"
}
```

### **Update Chat Title**
```bash
PUT /api/chats/507f1f77bcf86cd799439020/title
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Newton's Laws Discussion"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Chat title updated successfully",
  "data": {
    "chat": {
      "_id": "507f1f77bcf86cd799439020",
      "title": "Newton's Laws Discussion",
      "updatedAt": "2025-10-07T10:15:00.000Z"
    }
  },
  "timestamp": "2025-10-07T10:15:00.000Z"
}
```

### **Delete Chat**
```bash
DELETE /api/chats/507f1f77bcf86cd799439020
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Chat deleted successfully",
  "data": {
    "message": "Chat deleted successfully",
    "chatId": "507f1f77bcf86cd799439020"
  },
  "timestamp": "2025-10-07T10:20:00.000Z"
}
```

---

## 7. Error Responses

### **Chat Not Found**
```json
{
  "success": false,
  "message": "Chat not found",
  "error": {
    "code": "CHAT_NOT_FOUND"
  },
  "timestamp": "2025-10-07T10:00:00.000Z"
}
```

### **Empty Message**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "message",
        "message": "Message cannot be empty"
      }
    ]
  },
  "timestamp": "2025-10-07T10:00:00.000Z"
}
```

### **LLM Generation Error**
```json
{
  "success": false,
  "message": "Failed to generate response",
  "error": {
    "code": "LLM_GENERATION_ERROR"
  },
  "timestamp": "2025-10-07T10:00:00.000Z"
}
```

---

## 8. Testing Checklist

After implementation:

- [ ] Install dependencies successfully
- [ ] Hugging Face API configured correctly
- [ ] Can create new chat session
- [ ] Can list user's chats
- [ ] Can retrieve single chat with history
- [ ] Can send message and get AI response
- [ ] RAG retrieves relevant context from ChromaDB
- [ ] LLM generates coherent answers
- [ ] Citations are extracted correctly
- [ ] Messages are saved to database
- [ ] Can update chat title
- [ ] Can delete chat
- [ ] Streaming responses work (SSE)
- [ ] Chat history is included in context
- [ ] Multiple PDFs can be queried

---