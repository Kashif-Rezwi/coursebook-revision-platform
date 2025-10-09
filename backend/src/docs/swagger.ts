import swaggerJsdoc from 'swagger-jsdoc';
import config from '../config/env';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: config.app.name,
      version: config.app.version,
      description: 'AI-powered learning platform with PDF processing, RAG chat, and quiz generation',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api`,
        description: 'Development server'
      },
      {
        url: 'https://api.example.com/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'No token provided' },
                  error: {
                    type: 'object',
                    properties: {
                      code: { type: 'string', example: 'NO_TOKEN' }
                    }
                  }
                }
              }
            }
          }
        },
        RateLimitError: {
          description: 'Too many requests',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'Too many requests, please try again later' },
                  error: {
                    type: 'object',
                    properties: {
                      code: { type: 'string', example: 'RATE_LIMIT_EXCEEDED' }
                    }
                  }
                }
              }
            }
          }
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'Validation failed' },
                  error: {
                    type: 'object',
                    properties: {
                      code: { type: 'string', example: 'VALIDATION_ERROR' },
                      details: { type: 'array', items: { type: 'string' } }
                    }
                  }
                }
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'Resource not found' },
                  error: {
                    type: 'object',
                    properties: {
                      code: { type: 'string', example: 'NOT_FOUND' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            name: { type: 'string', example: 'John Doe' },
            role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        PDF: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            filename: { type: 'string', example: 'document.pdf' },
            originalName: { type: 'string', example: 'My Document.pdf' },
            fileSize: { type: 'number', example: 1024000 },
            mimeType: { type: 'string', example: 'application/pdf' },
            status: { type: 'string', enum: ['uploaded', 'processing', 'completed', 'failed'], example: 'completed' },
            userId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Chat: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            userId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            pdfId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            messages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['user', 'assistant'], example: 'user' },
                  content: { type: 'string', example: 'What is photosynthesis?' },
                  timestamp: { type: 'string', format: 'date-time' }
                }
              }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Quiz: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            pdfId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            userId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            title: { type: 'string', example: 'Photosynthesis Quiz' },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question: { type: 'string', example: 'What is photosynthesis?' },
                  options: { type: 'array', items: { type: 'string' } },
                  correctAnswer: { type: 'number', example: 0 },
                  explanation: { type: 'string', example: 'Photosynthesis is the process...' }
                }
              }
            },
            difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'], example: 'medium' },
            status: { type: 'string', enum: ['generating', 'completed', 'failed'], example: 'completed' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Progress: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            userId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            pdfId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            quizId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            score: { type: 'number', example: 85 },
            totalQuestions: { type: 'number', example: 10 },
            correctAnswers: { type: 'number', example: 8 },
            timeSpent: { type: 'number', example: 300 },
            completedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'PDFs', description: 'PDF management and processing' },
      { name: 'Chats', description: 'RAG-powered chat sessions' },
      { name: 'Quizzes', description: 'Quiz generation and submission' },
      { name: 'Progress', description: 'Learning analytics and progress tracking' },
      { name: 'Jobs', description: 'Background job status' },
      { name: 'Health', description: 'Health check endpoints' }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts']
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
