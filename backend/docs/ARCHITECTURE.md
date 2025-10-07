# System Architecture

## Overview
The Learning Platform is a full-stack AI-powered educational system built with Node.js, Express, MongoDB, and various AI services. It provides PDF processing, RAG-powered chat, quiz generation, and progress tracking capabilities.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Web App   │  │  Mobile App │  │   Admin UI  │            │
│  │  (React)    │  │  (React)    │  │  (React)    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS/REST API
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway Layer                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Express.js Server                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │   Rate      │  │   Request   │  │   Response  │    │   │
│  │  │  Limiting   │  │  Validation │  │   Logging   │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │   CORS      │  │   Helmet    │  │   Swagger   │    │   │
│  │  │   Config    │  │  Security   │  │   Docs      │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────────┐
│                    Business Logic Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │    Auth     │  │     PDF     │  │    Chat     │            │
│  │  Service    │  │   Service   │  │   Service   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Quiz      │  │  Progress   │  │    Job      │            │
│  │  Service    │  │   Service   │  │   Service   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────────┐
│                      Data Layer                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   MongoDB   │  │  ChromaDB   │  │    Redis    │            │
│  │ (Documents) │  │  (Vectors)  │  │ (Cache/Queue)│           │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────────┐
│                    External Services                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Hugging    │  │   OpenAI    │  │   File      │            │
│  │   Face      │  │   Embeddings│  │  Storage    │            │
│  │    API      │  │     API     │  │   (Local)   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Module Architecture

### 1. API Gateway Module
**Purpose**: Central entry point for all API requests

**Components**:
- **Rate Limiting**: Protects against abuse with configurable limits
- **Request Validation**: Validates incoming requests
- **Response Logging**: Tracks API usage and performance
- **CORS Configuration**: Handles cross-origin requests
- **Security Headers**: Implements security best practices
- **API Documentation**: Swagger/OpenAPI documentation

**Key Files**:
- `src/middlewares/rateLimiter.ts`
- `src/middlewares/apiLogger.ts`
- `src/routes/index.ts`
- `src/docs/swagger.ts`

### 2. Authentication Module
**Purpose**: User authentication and authorization

**Components**:
- **User Registration**: Creates new user accounts
- **User Login**: Authenticates users with JWT
- **Profile Management**: Updates user information
- **JWT Token Management**: Issues and validates tokens
- **Password Hashing**: Secure password storage

**Key Files**:
- `src/controllers/authController.ts`
- `src/routes/authRoutes.ts`
- `src/middlewares/authenticate.ts`
- `src/validators/authValidator.ts`

### 3. PDF Processing Module
**Purpose**: PDF upload, processing, and management

**Components**:
- **File Upload**: Handles PDF file uploads
- **PDF Processing**: Extracts text and metadata
- **Vector Generation**: Creates embeddings for RAG
- **File Management**: Stores and retrieves PDFs
- **Status Tracking**: Monitors processing status

**Key Files**:
- `src/controllers/pdfController.ts`
- `src/routes/pdfRoutes.ts`
- `src/services/pdfService.ts`
- `src/workers/pdfProcessor.ts`

### 4. Chat Module
**Purpose**: RAG-powered conversational interface

**Components**:
- **Chat Sessions**: Manages conversation history
- **RAG Integration**: Retrieves relevant context
- **LLM Integration**: Generates responses
- **Context Management**: Maintains conversation flow
- **Message Storage**: Persists chat history

**Key Files**:
- `src/controllers/chatController.ts`
- `src/routes/chatRoutes.ts`
- `src/services/chatService.ts`
- `src/services/ragService.ts`

### 5. Quiz Module
**Purpose**: AI-generated quiz creation and management

**Components**:
- **Quiz Generation**: Creates questions from PDF content
- **Question Types**: Multiple choice, true/false, etc.
- **Difficulty Levels**: Easy, medium, hard
- **Answer Validation**: Checks user responses
- **Scoring System**: Calculates quiz scores

**Key Files**:
- `src/controllers/quizController.ts`
- `src/routes/quizRoutes.ts`
- `src/services/quizService.ts`
- `src/workers/quizGenerator.ts`

### 6. Progress Tracking Module
**Purpose**: Learning analytics and progress monitoring

**Components**:
- **Progress Dashboard**: Overview of learning progress
- **Analytics Engine**: Calculates learning metrics
- **Score Tracking**: Monitors quiz performance
- **Time Tracking**: Records study time
- **Recommendations**: Suggests learning paths

**Key Files**:
- `src/controllers/progressController.ts`
- `src/routes/progressRoutes.ts`
- `src/services/progressService.ts`
- `src/utils/analyticsCalculator.ts`

### 7. Job Management Module
**Purpose**: Background job processing and monitoring

**Components**:
- **Job Queues**: Manages background tasks
- **Job Status**: Tracks job progress
- **Retry Logic**: Handles failed jobs
- **Priority System**: Manages job priorities
- **Monitoring**: Job performance metrics

**Key Files**:
- `src/controllers/jobController.ts`
- `src/routes/jobRoutes.ts`
- `src/queues/pdfProcessingQueue.ts`
- `src/queues/quizGenerationQueue.ts`

### 8. Health Monitoring Module
**Purpose**: System health checks and monitoring

**Components**:
- **Health Checks**: Monitors service status
- **System Metrics**: Tracks system performance
- **API Statistics**: Monitors API usage
- **Error Tracking**: Logs and reports errors
- **Uptime Monitoring**: Tracks system availability

**Key Files**:
- `src/controllers/healthController.ts`
- `src/utils/systemInfo.ts`
- `src/utils/apiStats.ts`

## Data Flow

### 1. User Registration Flow
```
Client → API Gateway → Auth Service → MongoDB → JWT Token → Client
```

### 2. PDF Upload Flow
```
Client → API Gateway → PDF Service → File Storage → Queue → Worker → ChromaDB
```

### 3. Chat Flow
```
Client → API Gateway → Chat Service → RAG Service → ChromaDB → LLM API → Response
```

### 4. Quiz Generation Flow
```
Client → API Gateway → Quiz Service → Queue → Worker → LLM API → MongoDB → Client
```

### 5. Progress Tracking Flow
```
Client → API Gateway → Progress Service → Analytics Engine → MongoDB → Dashboard
```

## Technology Stack

### Backend Technologies
- **Runtime**: Node.js 20.x
- **Framework**: Express.js 4.x
- **Language**: TypeScript 5.x
- **Process Manager**: PM2 (production)

### Databases
- **Primary Database**: MongoDB 6.x
  - Document storage for users, PDFs, chats, quizzes, progress
  - Replica set for high availability
  - Indexing for performance optimization

- **Vector Database**: ChromaDB 0.4.x
  - Vector storage for PDF embeddings
  - Similarity search for RAG
  - Persistent storage for embeddings

- **Cache/Queue**: Redis 7.x
  - Session storage
  - Rate limiting data
  - Background job queues
  - Caching frequently accessed data

### AI Services
- **LLM Provider**: Hugging Face API
  - Model: Mistral-7B-Instruct
  - Text generation for chat and quiz creation
  - Cost-effective inference

- **Embeddings**: OpenAI API
  - Model: text-embedding-3-small
  - High-quality vector embeddings
  - Consistent with industry standards

### External Services
- **File Storage**: Local filesystem
  - PDF file storage
  - Upload directory management
  - File cleanup and maintenance

### Development Tools
- **Build Tool**: TypeScript Compiler
- **Linting**: ESLint + Prettier
- **Testing**: Jest (planned)
- **Documentation**: Swagger/OpenAPI
- **Logging**: Winston

## Design Patterns

### 1. MVC Pattern
- **Models**: Data structures and database schemas
- **Views**: API responses (JSON)
- **Controllers**: Business logic and request handling

### 2. Service Layer Pattern
- **Services**: Business logic abstraction
- **Controllers**: Request/response handling
- **Repositories**: Data access abstraction

### 3. Queue Pattern
- **Asynchronous Processing**: Background job handling
- **Reliability**: Job retry and error handling
- **Scalability**: Horizontal scaling support

### 4. Middleware Pattern
- **Request Processing**: Authentication, validation, logging
- **Response Processing**: Error handling, formatting
- **Cross-cutting Concerns**: Security, monitoring

### 5. Factory Pattern
- **Service Creation**: Dynamic service instantiation
- **Configuration**: Environment-based configuration
- **Dependency Injection**: Loose coupling

## Security Architecture

### 1. Authentication
- **JWT Tokens**: Stateless authentication
- **Password Hashing**: bcrypt with salt rounds
- **Token Expiration**: Configurable token lifetime
- **Refresh Tokens**: Secure token renewal

### 2. Authorization
- **Role-based Access**: User and admin roles
- **Resource Protection**: User-specific data access
- **API Endpoint Security**: Protected routes
- **File Access Control**: User-specific file access

### 3. Input Validation
- **Schema Validation**: Request data validation
- **File Type Validation**: PDF file verification
- **Size Limits**: File size restrictions
- **Sanitization**: Input sanitization

### 4. Rate Limiting
- **Endpoint-specific Limits**: Different limits per endpoint
- **IP-based Limiting**: Per-IP request limits
- **User-based Limiting**: Per-user request limits
- **Upload Limiting**: File upload restrictions

### 5. Security Headers
- **Helmet.js**: Security header middleware
- **CORS Configuration**: Cross-origin request control
- **Content Security Policy**: XSS protection
- **HTTPS Enforcement**: SSL/TLS requirements

## Performance Architecture

### 1. Caching Strategy
- **Redis Caching**: Frequently accessed data
- **Response Caching**: API response caching
- **Session Caching**: User session data
- **Queue Caching**: Job queue data

### 2. Database Optimization
- **Indexing**: Strategic database indexes
- **Query Optimization**: Efficient database queries
- **Connection Pooling**: Database connection management
- **Read Replicas**: Read scaling (planned)

### 3. File Handling
- **Streaming**: Large file streaming
- **Compression**: File compression
- **Cleanup**: Automated file cleanup
- **CDN Integration**: Content delivery (planned)

### 4. API Optimization
- **Response Compression**: Gzip compression
- **Pagination**: Large dataset pagination
- **Field Selection**: Selective field retrieval
- **Batch Operations**: Bulk operations

## Scalability Architecture

### 1. Horizontal Scaling
- **Load Balancing**: Multiple server instances
- **Stateless Design**: No server-side sessions
- **Database Scaling**: Read replicas and sharding
- **Queue Scaling**: Multiple queue workers

### 2. Vertical Scaling
- **Resource Monitoring**: CPU and memory tracking
- **Auto-scaling**: Dynamic resource allocation
- **Performance Tuning**: Optimized configurations
- **Resource Limits**: Memory and CPU limits

### 3. Microservices Readiness
- **Service Separation**: Modular service design
- **API Gateway**: Centralized request routing
- **Service Discovery**: Dynamic service location
- **Inter-service Communication**: Service-to-service calls

## Monitoring and Observability

### 1. Logging
- **Structured Logging**: JSON-formatted logs
- **Log Levels**: Debug, info, warn, error
- **Request Logging**: API request/response logs
- **Error Logging**: Detailed error information

### 2. Metrics
- **API Metrics**: Request counts, response times
- **System Metrics**: CPU, memory, disk usage
- **Business Metrics**: User activity, quiz completion
- **Custom Metrics**: Application-specific metrics

### 3. Health Checks
- **Service Health**: Individual service status
- **Dependency Health**: External service status
- **Database Health**: Database connectivity
- **Queue Health**: Job queue status

### 4. Alerting
- **Error Alerts**: Critical error notifications
- **Performance Alerts**: Performance degradation
- **Resource Alerts**: Resource usage alerts
- **Business Alerts**: Business metric alerts

## Deployment Architecture

### 1. Development Environment
- **Local Development**: Docker Compose setup
- **Hot Reloading**: Development server with auto-reload
- **Debug Tools**: Debugging and profiling tools
- **Test Environment**: Isolated testing environment

### 2. Staging Environment
- **Production-like**: Similar to production setup
- **Integration Testing**: End-to-end testing
- **Performance Testing**: Load and stress testing
- **Security Testing**: Security vulnerability testing

### 3. Production Environment
- **High Availability**: Multiple server instances
- **Load Balancing**: Traffic distribution
- **SSL/TLS**: Encrypted communication
- **Monitoring**: Comprehensive monitoring setup

### 4. CI/CD Pipeline
- **Source Control**: Git-based version control
- **Automated Testing**: Continuous integration testing
- **Automated Deployment**: Continuous deployment
- **Rollback Capability**: Quick rollback on issues

## Future Enhancements

### 1. Microservices Migration
- **Service Decomposition**: Break into microservices
- **API Gateway**: Centralized API management
- **Service Mesh**: Inter-service communication
- **Container Orchestration**: Kubernetes deployment

### 2. Advanced AI Features
- **Custom Models**: Fine-tuned models
- **Multi-modal Support**: Image and video processing
- **Advanced RAG**: Improved retrieval systems
- **Personalization**: AI-powered recommendations

### 3. Performance Improvements
- **CDN Integration**: Content delivery network
- **Database Sharding**: Horizontal database scaling
- **Caching Layers**: Multi-level caching
- **Edge Computing**: Edge server deployment

### 4. Security Enhancements
- **OAuth Integration**: Third-party authentication
- **API Key Management**: Secure API key handling
- **Audit Logging**: Comprehensive audit trails
- **Compliance**: GDPR and other compliance

## Conclusion

The Learning Platform architecture is designed for scalability, maintainability, and performance. The modular design allows for easy extension and modification, while the comprehensive monitoring and security measures ensure reliable operation in production environments.

The system follows industry best practices and is built with modern technologies that provide a solid foundation for future growth and enhancement.
