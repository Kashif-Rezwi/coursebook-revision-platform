# Module 1: Core Infrastructure - Low-Level Design (LLD)

---

## 1. Module Overview

**Purpose**: Establish the foundational layer for the entire backend application.

**Responsibilities**:
- Express server initialization and configuration
- Centralized error handling mechanism
- Request/response middleware pipeline
- Environment variable management
- Structured logging system
- Input validation utilities
- Standardized API response formatting

**Success Criteria**:
- Server starts successfully on configured port
- All errors are caught and returned in consistent format
- Logs are written to files and console with appropriate levels
- Environment variables are validated on startup
- CORS, body parsing, and security headers configured

---

## 2. Directory Structure

```
backend/
├── src/
│   ├── app.js                          # Express app configuration
│   ├── server.js                       # Server entry point
│   │
│   ├── config/
│   │   └── env.js                      # Environment variable validation & export
│   │
│   ├── middlewares/
│   │   ├── errorHandler.js             # Global error handling middleware
│   │   ├── requestValidator.js         # Joi-based request validation
│   │   ├── notFound.js                 # 404 handler
│   │   └── requestLogger.js            # HTTP request logging
│   │
│   └── utils/
│       ├── logger.js                   # Winston logger configuration
│       ├── apiResponse.js              # Standardized response helpers
│       ├── apiError.js                 # Custom error class
│       └── asyncHandler.js             # Async route wrapper
│
├── .env.example                        # Template for environment variables
├── .env                                # Actual environment variables (gitignored)
├── .gitignore
├── package.json
└── README.md
```

---

## 3. Detailed Component Design

### **A. Environment Configuration (`config/env.js`)**

**Purpose**: Centralize and validate all environment variables

**Schema**:
```javascript
{
  NODE_ENV: 'development' | 'production' | 'test',
  PORT: number (default: 3001),
  MONGODB_URI: string (required),
  JWT_SECRET: string (required),
  JWT_EXPIRE: string (default: '7d'),
  REDIS_URL: string (required),
  CHROMADB_HOST: string (default: 'localhost'),
  CHROMADB_PORT: number (default: 8000),
  LLM_API_KEY: string (required),
  LLM_MODEL: string (default: 'gpt-4'),
  FILE_UPLOAD_PATH: string (default: './uploads'),
  MAX_FILE_SIZE: number (default: 52428800), // 50MB
  CORS_ORIGIN: string (default: 'http://localhost:3000'),
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug' (default: 'info')
}
```

**Validation Strategy**:
- Use `dotenv` to load `.env` file
- Validate required fields on startup (throw error if missing)
- Provide sensible defaults for optional fields
- Export a frozen object to prevent runtime modification

---

### **B. Logger (`utils/logger.js`)**

**Purpose**: Provide structured logging across the application

**Technology**: Winston

**Configuration**:
- **Console Transport**: Colorized output for development
- **File Transport**: 
  - `logs/error.log` - Only error level
  - `logs/combined.log` - All levels
- **Log Format**: 
  ```
  [2025-10-06 14:23:45] [INFO] [auth.service.js:45] User logged in: user@example.com
  ```
- **Log Levels**: error, warn, info, http, debug

**Features**:
- Automatic file rotation (daily)
- Max file size: 20MB
- Keep logs for 14 days
- Include metadata (filename, line number, timestamp)

---

### **C. API Response Utilities (`utils/apiResponse.js`)**

**Purpose**: Standardize all API responses

**Response Format**:
```javascript
// Success Response
{
  success: true,
  message: "Operation successful",
  data: { ... },
  timestamp: "2025-10-06T14:23:45.123Z"
}

// Error Response
{
  success: false,
  message: "Error description",
  error: {
    code: "VALIDATION_ERROR",
    details: [ ... ]
  },
  timestamp: "2025-10-06T14:23:45.123Z"
}
```

**Helper Functions**:
- `successResponse(res, statusCode, message, data)` - Send success response
- `errorResponse(res, statusCode, message, errorCode, details)` - Send error response

---

### **D. Custom Error Class (`utils/apiError.js`)**

**Purpose**: Create consistent error objects across the application

**Class Structure**:
```javascript
class ApiError extends Error {
  constructor(statusCode, message, errorCode, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational; // Distinguish operational vs programming errors
    this.timestamp = new Date().toISOString();
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
```

**Pre-defined Error Factories**:
- `ApiError.badRequest(message, errorCode)`
- `ApiError.unauthorized(message)`
- `ApiError.forbidden(message)`
- `ApiError.notFound(message)`
- `ApiError.internal(message)`

---

### **E. Async Handler (`utils/asyncHandler.js`)**

**Purpose**: Eliminate try-catch blocks in route handlers

**Implementation**:
```javascript
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

**Usage**:
```javascript
// Before
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

// After
router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json(users);
}));
```

---

### **F. Global Error Handler (`middlewares/errorHandler.js`)**

**Purpose**: Catch all errors and return consistent responses

**Error Handling Strategy**:

1. **Mongoose Validation Errors** → 400 Bad Request
2. **JWT Errors** → 401 Unauthorized
3. **Multer File Upload Errors** → 400 Bad Request
4. **Custom ApiError** → Use specified status code
5. **Unhandled Errors** → 500 Internal Server Error (log stack trace)

**Features**:
- Log all errors with stack traces
- Hide sensitive error details in production
- Send detailed errors in development

---

### **G. Request Validator (`middlewares/requestValidator.js`)**

**Purpose**: Validate incoming request data using Joi schemas

**Technology**: Joi

**Function Signature**:
```javascript
const validate = (schema) => (req, res, next) => {
  // Validate req.body, req.query, req.params against schema
  // If validation fails, throw ApiError with details
  // If passes, continue to next middleware
};
```

**Usage Example**:
```javascript
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required()
});

router.post('/login', validate(loginSchema), authController.login);
```

---

### **H. Request Logger (`middlewares/requestLogger.js`)**

**Purpose**: Log all incoming HTTP requests

**Implementation**: Morgan middleware

**Log Format**:
```
:method :url :status :response-time ms - :res[content-length]
```

**Example Output**:
```
POST /api/auth/login 200 45ms - 234
GET /api/pdfs 401 12ms - 89
```

---

### **I. 404 Handler (`middlewares/notFound.js`)**

**Purpose**: Handle requests to undefined routes

**Implementation**:
```javascript
const notFound = (req, res, next) => {
  const error = ApiError.notFound(`Route ${req.originalUrl} not found`);
  next(error);
};
```

---

### **J. Express App Configuration (`app.js`)**

**Purpose**: Configure Express application (no server start)

**Middleware Order**:
```javascript
1. Helmet (security headers)
2. CORS
3. Morgan (request logging)
4. express.json() (body parser)
5. express.urlencoded() (URL-encoded data)
6. Custom request logger
7. Routes (will be added in Module 9)
8. 404 handler
9. Global error handler
```

**Exports**: Configured Express app instance

---

### **K. Server Entry Point (`server.js`)**

**Purpose**: Start the HTTP server

**Responsibilities**:
1. Load environment variables
2. Import Express app
3. Start server on configured port
4. Handle graceful shutdown (SIGTERM, SIGINT)
5. Handle uncaught exceptions/rejections

**Graceful Shutdown Flow**:
```
Signal received (SIGTERM/SIGINT)
  → Log shutdown message
  → Stop accepting new requests
  → Close database connections (will add in Module 2)
  → Exit process
```

---

## 4. Error Code Standards

**Error Code Format**: `CATEGORY_SPECIFIC_ERROR`

**Categories**:
- `AUTH_*` - Authentication/Authorization errors
- `VALIDATION_*` - Input validation errors
- `NOT_FOUND_*` - Resource not found errors
- `UPLOAD_*` - File upload errors
- `EXTERNAL_*` - Third-party service errors
- `INTERNAL_*` - Server errors

**Examples**:
- `AUTH_INVALID_CREDENTIALS`
- `VALIDATION_MISSING_FIELD`
- `NOT_FOUND_PDF`
- `UPLOAD_FILE_TOO_LARGE`
- `EXTERNAL_LLM_TIMEOUT`
- `INTERNAL_DATABASE_ERROR`

---

## 5. Environment Variables (`.env.example`)

```env
# Server Configuration
NODE_ENV=development
PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/learning-platform

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Redis (for Bull Queue)
REDIS_URL=redis://localhost:6379

# ChromaDB
CHROMADB_HOST=localhost
CHROMADB_PORT=8000

# LLM Configuration
LLM_API_KEY=your-openai-or-anthropic-api-key
LLM_MODEL=gpt-4

# File Upload
FILE_UPLOAD_PATH=./uploads
MAX_FILE_SIZE=52428800

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info
```

---

## 6. NPM Dependencies

**Production Dependencies**:
```json
{
  "express": "^4.18.2",
  "dotenv": "^16.3.1",
  "helmet": "^7.1.0",
  "cors": "^2.8.5",
  "morgan": "^1.10.0",
  "winston": "^3.11.0",
  "winston-daily-rotate-file": "^4.7.1",
  "joi": "^17.11.0"
}
```

**Dev Dependencies**:
```json
{
  "nodemon": "^3.0.2"
}
```

---

## 7. Package.json Scripts

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "echo \"Tests will be added later\" && exit 0"
  }
}
```

---

## 8. Testing Checklist

After implementation, verify:

- [ ] Server starts on correct port
- [ ] Environment variables are validated (server crashes if required vars missing)
- [ ] Logs are created in `logs/` directory
- [ ] Console logs are colorized in development
- [ ] Request to undefined route returns 404 with consistent format
- [ ] Errors are caught and formatted correctly
- [ ] CORS headers are present in responses
- [ ] Security headers (Helmet) are applied

---

## 9. API Response Examples

**Success Response**:
```bash
GET /api/health
Status: 200 OK

{
  "success": true,
  "message": "Server is healthy",
  "data": {
    "uptime": 12345,
    "timestamp": "2025-10-06T14:23:45.123Z"
  },
  "timestamp": "2025-10-06T14:23:45.123Z"
}
```

**Error Response**:
```bash
POST /api/auth/login
Status: 400 Bad Request

{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  },
  "timestamp": "2025-10-06T14:23:45.123Z"
}
```

---
