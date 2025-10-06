# Module 3: Authentication & Authorization - Low-Level Design (LLD)

---

## 1. Module Overview

**Purpose**: Implement secure user authentication and authorization system with JWT-based token management.

**Responsibilities**:
- User registration with validation
- User login with credential verification
- JWT token generation and verification
- Password hashing and comparison
- Protected route middleware
- Token refresh mechanism
- User profile management
- Role-based access control (RBAC) foundation

**Success Criteria**:
- Users can register with validated credentials
- Users can login and receive JWT tokens
- Protected routes verify JWT tokens correctly
- Tokens expire and are validated properly
- Passwords are securely hashed
- User sessions are stateless
- Proper error messages for auth failures

---

## 2. Directory Structure

```
backend/
├── src/
│   ├── controllers/
│   │   └── authController.js           # Auth route handlers
│   │
│   ├── services/
│   │   └── authService.js              # Auth business logic
│   │
│   ├── middlewares/
│   │   ├── authenticate.js             # JWT verification middleware
│   │   └── authorize.js                # Role-based authorization
│   │
│   ├── utils/
│   │   ├── jwtHelper.js                # JWT token utilities
│   │   └── passwordHelper.js           # Password utilities
│   │
│   ├── validators/
│   │   └── authValidator.js            # Joi validation schemas
│   │
│   ├── routes/
│   │   └── authRoutes.js               # Auth API routes
│   │
│   └── app.js                          # (Update to include auth routes)
```

---

## 3. Technology Stack for Module 3

**New Dependencies**:
```json
{
  "jsonwebtoken": "^9.0.2"
}
```

**Note**: `bcryptjs` was already installed in Module 2.

---

## 4. Detailed Component Design

### **A. JWT Helper (`utils/jwtHelper.js`)**

**Purpose**: Centralize JWT token operations

**Functions**:

1. **`generateAccessToken(payload)`**
   - Creates JWT token with user data
   - Expiration from config (default: 7 days)
   - Returns signed token string

2. **`verifyToken(token)`**
   - Verifies JWT token signature
   - Returns decoded payload or throws error
   - Handles expired/invalid tokens

3. **`decodeToken(token)`**
   - Decodes token without verification (for inspection)
   - Returns payload or null

**Token Payload Structure**:
```javascript
{
  userId: "507f1f77bcf86cd799439011",
  email: "user@example.com",
  role: "student",
  iat: 1696598400,  // Issued at
  exp: 1697203200   // Expiration
}
```

**Implementation Pattern**:
```javascript
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const ApiError = require('./apiError');

const generateAccessToken = (payload) => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpire
  });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token expired', 'TOKEN_EXPIRED');
    }
    throw ApiError.unauthorized('Invalid token', 'INVALID_TOKEN');
  }
};

const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  generateAccessToken,
  verifyToken,
  decodeToken
};
```

---

### **B. Password Helper (`utils/passwordHelper.js`)**

**Purpose**: Utility functions for password operations (complementing User model)

**Functions**:

1. **`validatePasswordStrength(password)`**
   - Check minimum length (8 chars)
   - Check for uppercase, lowercase, number, special char
   - Returns `{ isValid: boolean, errors: string[] }`

**Implementation Pattern**:
```javascript
const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validatePasswordStrength
};
```

---

### **C. Auth Validator (`validators/authValidator.js`)**

**Purpose**: Joi schemas for request validation

**Schemas**:

1. **`registerSchema`**
   - email: required, valid email format
   - password: required, min 8 chars
   - name: required, string, trim
   - role: optional, enum ['student', 'admin'], default 'student'

2. **`loginSchema`**
   - email: required, valid email format
   - password: required

3. **`refreshTokenSchema`**
   - refreshToken: required, string

**Implementation Pattern**:
```javascript
const Joi = require('joi');

const registerSchema = Joi.object({
  body: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .min(8)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'any.required': 'Password is required'
      }),
    name: Joi.string()
      .trim()
      .required()
      .messages({
        'any.required': 'Name is required'
      }),
    role: Joi.string()
      .valid('student', 'admin')
      .default('student')
  })
});

const loginSchema = Joi.object({
  body: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
      })
  })
});

module.exports = {
  registerSchema,
  loginSchema
};
```

---

### **D. Auth Service (`services/authService.js`)**

**Purpose**: Business logic for authentication operations

**Functions**:

1. **`register(userData)`**
   - Validate password strength
   - Check if email already exists
   - Create user in database
   - Create initial Progress document
   - Return user object (without password)

2. **`login(email, password)`**
   - Find user by email (include password field)
   - Verify password using User model method
   - Generate JWT token
   - Return { user, token }

3. **`getUserById(userId)`**
   - Fetch user by ID
   - Return user object (without password)

4. **`updateProfile(userId, updateData)`**
   - Update user name or other profile fields
   - Return updated user

**Implementation Pattern**:
```javascript
const { User, Progress } = require('../models');
const { generateAccessToken } = require('../utils/jwtHelper');
const { validatePasswordStrength } = require('../utils/passwordHelper');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');

class AuthService {
  async register(userData) {
    const { email, password, name, role } = userData;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw ApiError.badRequest(
        passwordValidation.errors.join(', '),
        'WEAK_PASSWORD'
      );
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.badRequest('Email already registered', 'EMAIL_EXISTS');
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name,
      role: role || 'student'
    });

    // Create progress document
    await Progress.create({
      userId: user._id,
      recentActivity: [{
        type: 'account_created',
        description: 'Account created successfully',
        timestamp: new Date()
      }]
    });

    logger.info(`New user registered: ${email}`);

    return user;
  }

  async login(email, password) {
    // Find user with password field
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      throw ApiError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Generate token
    const token = generateAccessToken({
      userId: user._id,
      email: user.email,
      role: user.role
    });

    logger.info(`User logged in: ${email}`);

    // Remove password from user object
    const userObject = user.toJSON();

    return {
      user: userObject,
      token
    };
  }

  async getUserById(userId) {
    const user = await User.findById(userId);
    
    if (!user) {
      throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
    }

    return user;
  }

  async updateProfile(userId, updateData) {
    const allowedUpdates = ['name'];
    const updates = {};

    // Filter only allowed fields
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = updateData[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
    }

    logger.info(`User profile updated: ${user.email}`);

    return user;
  }
}

module.exports = new AuthService();
```

---

### **E. Auth Controller (`controllers/authController.js`)**

**Purpose**: Handle HTTP requests/responses for auth routes

**Functions**:

1. **`register(req, res, next)`**
   - Extract user data from req.body
   - Call authService.register()
   - Return 201 with user data and token

2. **`login(req, res, next)`**
   - Extract credentials from req.body
   - Call authService.login()
   - Return 200 with user data and token

3. **`getProfile(req, res, next)`**
   - Extract userId from req.user (set by auth middleware)
   - Call authService.getUserById()
   - Return 200 with user data

4. **`updateProfile(req, res, next)`**
   - Extract userId from req.user
   - Extract update data from req.body
   - Call authService.updateProfile()
   - Return 200 with updated user

5. **`logout(req, res, next)`**
   - Return success message (JWT is stateless, no server-side logout needed)

**Implementation Pattern**:
```javascript
const authService = require('../services/authService');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { generateAccessToken } = require('../utils/jwtHelper');

class AuthController {
  register = asyncHandler(async (req, res) => {
    const user = await authService.register(req.body);

    // Generate token for immediate login
    const token = generateAccessToken({
      userId: user._id,
      email: user.email,
      role: user.role
    });

    return successResponse(
      res,
      201,
      'User registered successfully',
      { user, token }
    );
  });

  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    return successResponse(
      res,
      200,
      'Login successful',
      result
    );
  });

  getProfile = asyncHandler(async (req, res) => {
    const user = await authService.getUserById(req.user.userId);

    return successResponse(
      res,
      200,
      'Profile retrieved successfully',
      { user }
    );
  });

  updateProfile = asyncHandler(async (req, res) => {
    const user = await authService.updateProfile(req.user.userId, req.body);

    return successResponse(
      res,
      200,
      'Profile updated successfully',
      { user }
    );
  });

  logout = asyncHandler(async (req, res) => {
    // JWT is stateless, so just return success
    // Client should delete token from storage
    return successResponse(
      res,
      200,
      'Logout successful',
      null
    );
  });
}

module.exports = new AuthController();
```

---

### **F. Authenticate Middleware (`middlewares/authenticate.js`)**

**Purpose**: Verify JWT token and attach user data to request

**Flow**:
1. Extract token from Authorization header (`Bearer <token>`)
2. Verify token using jwtHelper
3. Attach decoded payload to `req.user`
4. Continue to next middleware

**Error Cases**:
- No token provided → 401 Unauthorized
- Invalid token → 401 Unauthorized
- Expired token → 401 Unauthorized

**Implementation Pattern**:
```javascript
const { verifyToken } = require('../utils/jwtHelper');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

const authenticate = asyncHandler(async (req, res, next) => {
  // Extract token from header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('No token provided', 'NO_TOKEN');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Verify token
  const decoded = verifyToken(token);

  // Attach user data to request
  req.user = {
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role
  };

  next();
});

module.exports = authenticate;
```

---

### **G. Authorize Middleware (`middlewares/authorize.js`)**

**Purpose**: Role-based access control

**Usage**: `authorize('admin')` or `authorize(['admin', 'teacher'])`

**Implementation Pattern**:
```javascript
const ApiError = require('../utils/apiError');

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }

    const hasRole = allowedRoles.includes(req.user.role);

    if (!hasRole) {
      throw ApiError.forbidden(
        'You do not have permission to perform this action',
        'FORBIDDEN'
      );
    }

    next();
  };
};

module.exports = authorize;
```

---

### **H. Auth Routes (`routes/authRoutes.js`)**

**Purpose**: Define authentication API endpoints

**Routes**:

| Method | Endpoint | Middleware | Controller | Description |
|--------|----------|------------|------------|-------------|
| POST | `/register` | validate(registerSchema) | authController.register | User registration |
| POST | `/login` | validate(loginSchema) | authController.login | User login |
| GET | `/profile` | authenticate | authController.getProfile | Get user profile |
| PUT | `/profile` | authenticate | authController.updateProfile | Update profile |
| POST | `/logout` | authenticate | authController.logout | Logout (client-side) |

**Implementation Pattern**:
```javascript
const express = require('express');
const authController = require('../controllers/authController');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/requestValidator');
const { registerSchema, loginSchema } = require('../validators/authValidator');

const router = express.Router();

// Public routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
```

---

### **I. Update App.js to Include Auth Routes**

**Add to `src/app.js`** (after request logger, before 404 handler):

```javascript
// Import routes
const authRoutes = require('./routes/authRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
```

---

## 5. API Request/Response Examples

### **Register User**
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass@123",
  "name": "John Doe"
}
```

**Response (201)**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "student",
      "createdAt": "2025-10-06T14:23:45.123Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2025-10-06T14:23:45.123Z"
}
```

### **Login**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass@123"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "student"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2025-10-06T14:23:45.123Z"
}
```

### **Get Profile (Protected)**
```bash
GET /api/auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "student",
      "createdAt": "2025-10-06T14:23:45.123Z"
    }
  },
  "timestamp": "2025-10-06T14:23:45.123Z"
}
```

### **Update Profile**
```bash
PUT /api/auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "John Smith"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "john@example.com",
      "name": "John Smith",
      "role": "student"
    }
  },
  "timestamp": "2025-10-06T14:23:45.123Z"
}
```

---

## 6. Error Responses

### **Validation Error**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "email",
        "message": "Please provide a valid email address"
      }
    ]
  },
  "timestamp": "2025-10-06T14:23:45.123Z"
}
```

### **Weak Password**
```json
{
  "success": false,
  "message": "Password must contain at least one uppercase letter, Password must contain at least one special character (!@#$%^&*)",
  "error": {
    "code": "WEAK_PASSWORD"
  },
  "timestamp": "2025-10-06T14:23:45.123Z"
}
```

### **Email Already Exists**
```json
{
  "success": false,
  "message": "Email already registered",
  "error": {
    "code": "EMAIL_EXISTS"
  },
  "timestamp": "2025-10-06T14:23:45.123Z"
}
```

### **Invalid Credentials**
```json
{
  "success": false,
  "message": "Invalid credentials",
  "error": {
    "code": "INVALID_CREDENTIALS"
  },
  "timestamp": "2025-10-06T14:23:45.123Z"
}
```

### **No Token**
```json
{
  "success": false,
  "message": "No token provided",
  "error": {
    "code": "NO_TOKEN"
  },
  "timestamp": "2025-10-06T14:23:45.123Z"
}
```

### **Invalid/Expired Token**
```json
{
  "success": false,
  "message": "Token expired",
  "error": {
    "code": "TOKEN_EXPIRED"
  },
  "timestamp": "2025-10-06T14:23:45.123Z"
}
```

---

## 7. Security Best Practices Implemented

1. **Password Security**:
   - Bcrypt hashing with 10 salt rounds
   - Password strength validation
   - Never return password in API responses

2. **Token Security**:
   - JWT with expiration
   - Secret key from environment variables
   - Token verification on protected routes

3. **Input Validation**:
   - Joi schema validation
   - Email format validation
   - SQL injection prevention (Mongoose)

4. **Error Handling**:
   - Generic error messages (don't reveal if email exists on login)
   - Consistent error codes
   - Proper HTTP status codes

---

## 8. Testing Checklist

After implementation:

- [ ] Register new user successfully
- [ ] Register with existing email returns error
- [ ] Register with weak password returns validation errors
- [ ] Login with valid credentials returns token
- [ ] Login with invalid credentials returns error
- [ ] Access protected route without token returns 401
- [ ] Access protected route with valid token succeeds
- [ ] Access protected route with expired token returns 401
- [ ] Get user profile returns correct data
- [ ] Update user profile works correctly
- [ ] Logout endpoint returns success

---
