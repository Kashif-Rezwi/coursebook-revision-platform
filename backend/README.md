# Learning Platform Backend

An AI-powered learning platform backend with PDF processing, RAG chat, quiz generation, and progress tracking capabilities.

## 🚀 Features

- **PDF Processing**: Upload and process PDF documents with AI-powered text extraction
- **RAG Chat**: Conversational interface with Retrieval-Augmented Generation
- **Quiz Generation**: AI-generated quizzes from PDF content with multiple difficulty levels
- **Progress Tracking**: Comprehensive learning analytics and progress monitoring
- **User Authentication**: Secure JWT-based authentication system
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **Rate Limiting**: Configurable rate limiting for API protection
- **Health Monitoring**: Comprehensive health checks and system monitoring
- **Background Jobs**: Queue-based processing for heavy operations

## 📋 Prerequisites

- **Node.js**: 18.x or 20.x (LTS recommended)
- **MongoDB**: 6.0+ (with replica set for production)
- **Redis**: 7.0+ (for caching and queues)
- **ChromaDB**: 0.4.0+ (for vector storage)
- **Memory**: 2GB+ RAM (4GB+ recommended for production)

## 🛠️ Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd coursebook-revision-platform/backend
npm install
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 3. Start Services
```bash
# Start MongoDB (if not running)
sudo systemctl start mongod

# Start Redis (if not running)
sudo systemctl start redis-server

# Start ChromaDB with Docker
docker run -p 8000:8000 --name chromadb chromadb/chroma:latest
```

### 4. Run Application
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## 🔧 Configuration

### Required Environment Variables

```env
# Server Configuration
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://localhost:27017/learning-platform

# Redis
REDIS_URL=redis://localhost:6379

# ChromaDB
CHROMADB_HOST=localhost
CHROMADB_PORT=8000

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# AI Services
HUGGINGFACE_API_KEY=your_huggingface_api_key
LLM_API_KEY=your_llm_api_key
EMBEDDING_API_KEY=your_openai_api_key

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

### Optional Environment Variables

```env
# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── app.ts                    # Express application setup
│   ├── server.ts                 # Server entry point
│   ├── config/                   # Configuration files
│   │   ├── env.ts               # Environment configuration
│   │   ├── database.ts          # MongoDB configuration
│   │   ├── chromadb.ts          # ChromaDB configuration
│   │   ├── multer.ts            # File upload configuration
│   │   └── queue.ts             # Redis queue configuration
│   ├── controllers/              # Request handlers
│   │   ├── authController.ts    # Authentication controller
│   │   ├── pdfController.ts     # PDF management controller
│   │   ├── chatController.ts    # Chat controller
│   │   ├── quizController.ts    # Quiz controller
│   │   ├── progressController.ts # Progress tracking controller
│   │   ├── jobController.ts     # Job management controller
│   │   └── healthController.ts  # Health check controller
│   ├── middlewares/              # Express middlewares
│   │   ├── authenticate.ts      # JWT authentication
│   │   ├── rateLimiter.ts       # Rate limiting
│   │   ├── apiLogger.ts         # API logging
│   │   ├── requestValidator.ts  # Request validation
│   │   ├── errorHandler.ts      # Error handling
│   │   └── notFound.ts          # 404 handler
│   ├── routes/                   # API routes
│   │   ├── index.ts             # Centralized routes
│   │   ├── authRoutes.ts        # Authentication routes
│   │   ├── pdfRoutes.ts         # PDF routes
│   │   ├── chatRoutes.ts        # Chat routes
│   │   ├── quizRoutes.ts        # Quiz routes
│   │   ├── progressRoutes.ts    # Progress routes
│   │   ├── jobRoutes.ts         # Job routes
│   │   └── embeddingRoutes.ts   # Embedding routes
│   ├── services/                 # Business logic
│   │   ├── authService.ts       # Authentication service
│   │   ├── pdfService.ts        # PDF processing service
│   │   ├── chatService.ts       # Chat service
│   │   ├── quizService.ts       # Quiz service
│   │   ├── progressService.ts   # Progress service
│   │   ├── ragService.ts        # RAG service
│   │   └── aiService.ts         # Unified AI service
│   ├── models/                   # Database models
│   │   ├── User.ts              # User model
│   │   ├── PDF.ts               # PDF model
│   │   ├── Chat.ts              # Chat model
│   │   ├── Quiz.ts              # Quiz model
│   │   ├── Progress.ts          # Progress model
│   │   └── QuizAttempt.ts       # Quiz attempt model
│   ├── utils/                    # Utility functions
│   │   ├── logger.ts            # Logging utility
│   │   ├── apiResponse.ts       # API response helpers
│   │   ├── apiError.ts          # Error handling
│   │   ├── asyncHandler.ts      # Async error handling
│   │   ├── apiStats.ts          # API statistics
│   │   └── systemInfo.ts        # System information
│   ├── workers/                  # Background workers
│   │   ├── pdfProcessor.ts      # PDF processing worker
│   │   └── quizGenerator.ts     # Quiz generation worker
│   ├── queues/                   # Queue definitions
│   │   ├── pdfProcessingQueue.ts # PDF processing queue
│   │   └── quizGenerationQueue.ts # Quiz generation queue
│   ├── validators/               # Request validators
│   │   ├── authValidator.ts     # Auth validation
│   │   ├── pdfValidator.ts      # PDF validation
│   │   ├── chatValidator.ts     # Chat validation
│   │   ├── quizValidator.ts     # Quiz validation
│   │   └── progressValidator.ts # Progress validation
│   └── docs/                     # Documentation
│       └── swagger.ts           # Swagger configuration
├── docs/                         # Documentation files
│   ├── API.md                   # API documentation
│   ├── DEPLOYMENT.md            # Deployment guide
│   └── ARCHITECTURE.md          # Architecture overview
├── uploads/                      # File upload directory
├── logs/                         # Log files
├── dist/                         # Compiled JavaScript
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

## 🚀 API Endpoints

### Base URL
- Development: `http://localhost:3001/api`
- Production: `https://api.example.com/api`

### API Version
Current version: **v1**

### Authentication
All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Key Endpoints

#### Health Check
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed system health
- `GET /api/health/system` - System information

#### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/profile` - Get user profile
- `PUT /api/v1/auth/profile` - Update user profile

#### PDF Management
- `POST /api/v1/pdfs/upload` - Upload PDF
- `GET /api/v1/pdfs` - Get user PDFs
- `GET /api/v1/pdfs/:id` - Get specific PDF
- `DELETE /api/v1/pdfs/:id` - Delete PDF

#### Chat Sessions
- `POST /api/v1/chats` - Create chat session
- `GET /api/v1/chats` - Get user chats
- `POST /api/v1/chats/:id/messages` - Send message

#### Quiz Generation
- `POST /api/v1/quizzes/generate` - Generate quiz
- `GET /api/v1/quizzes` - Get user quizzes
- `GET /api/v1/quizzes/:id` - Get specific quiz
- `POST /api/v1/quizzes/:id/submit` - Submit quiz

#### Progress Tracking
- `GET /api/v1/progress/dashboard` - Get progress dashboard
- `GET /api/v1/progress/stats` - Get progress statistics
- `GET /api/v1/progress/analytics` - Get learning analytics

## 📚 Documentation

- **[API Documentation](docs/API.md)** - Complete API reference with examples
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment instructions
- **[Architecture Overview](docs/ARCHITECTURE.md)** - System architecture and design

### Interactive Documentation
Visit `/api/docs` for interactive Swagger documentation where you can test endpoints directly in your browser.

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Configurable rate limits per endpoint
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Cross-origin request security
- **Security Headers**: Helmet.js security middleware
- **File Upload Security**: File type and size validation

## 📊 Monitoring

- **Health Checks**: System and service health monitoring
- **API Statistics**: Request counts, response times, error rates
- **System Metrics**: CPU, memory, disk usage
- **Logging**: Structured logging with multiple levels
- **Error Tracking**: Comprehensive error logging and reporting

## 🚀 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run format       # Format code with Prettier

# Database
npm run db:seed      # Seed database with sample data
npm run db:reset     # Reset database
```

### Development Workflow

1. **Start Services**: Ensure MongoDB, Redis, and ChromaDB are running
2. **Environment Setup**: Configure `.env` file
3. **Install Dependencies**: Run `npm install`
4. **Start Development Server**: Run `npm run dev`
5. **Access API**: Visit `http://localhost:3001/api`
6. **View Documentation**: Visit `http://localhost:3001/api/docs`

## 🧪 Testing

### Manual Testing

#### Health Check
```bash
curl http://localhost:3001/api/health
```

#### Authentication
```bash
# Register
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@123","name":"Test User"}'

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@123"}'
```

#### Rate Limiting Test
```bash
# Test auth rate limit (should block after 5 attempts)
for i in {1..7}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:3001/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo ""
  sleep 1
done
```

## 🚀 Deployment

### Production Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed production deployment instructions including:

- Docker deployment
- PM2 process management
- Nginx configuration
- SSL certificate setup
- Monitoring and logging
- Backup strategies

### Quick Docker Deployment

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f api

# Scale API instances
docker-compose up -d --scale api=3
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests and linting: `npm run lint && npm run test`
5. Commit your changes: `git commit -m 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

1. Check the [API Documentation](docs/API.md)
2. Review the [Deployment Guide](docs/DEPLOYMENT.md)
3. Check the [Architecture Overview](docs/ARCHITECTURE.md)
4. Open an issue on GitHub
5. Contact the development team

## 🎯 Roadmap

### Completed Features
- [x] Core infrastructure and configuration
- [x] User authentication and authorization
- [x] PDF upload and processing
- [x] RAG-powered chat system
- [x] AI quiz generation
- [x] Progress tracking and analytics
- [x] Background job processing
- [x] API documentation and monitoring
- [x] Rate limiting and security
- [x] Health checks and system monitoring

### Planned Features
- [ ] Unit and integration tests
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Mobile app API endpoints
- [ ] Real-time notifications
- [ ] Advanced AI features
- [ ] Microservices architecture
- [ ] Kubernetes deployment
- [ ] Performance optimization
- [ ] Advanced security features

## 📊 Module Status

- [x] **Module 1**: Core Infrastructure
- [x] **Module 2**: Database Configuration
- [x] **Module 3**: Authentication System
- [x] **Module 4**: PDF Processing
- [x] **Module 5**: Chat System
- [x] **Module 6**: Quiz Generation
- [x] **Module 7**: Progress Tracking
- [x] **Module 8**: Background Jobs
- [x] **Module 9**: API Gateway & Routes (Final Integration)

---

**Built with ❤️ using Node.js, Express, TypeScript, MongoDB, Redis, ChromaDB, and AI services.**