# Learning Platform Backend

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration

4. Run in development mode:
```bash
npm run dev
```

5. Run in production mode:
```bash
npm start
```

## Project Structure

```
src/
├── app.js              # Express configuration
├── server.js           # Server entry point
├── config/             # Configuration files
├── middlewares/        # Express middlewares
└── utils/              # Utility functions
```

## Environment Variables

See `.env.example` for all required and optional variables.

## Module Status
- [x] Module 1: Core Infrastructure
- [ ] Module 2: Database Configuration
- [ ] Module 3: Authentication
- [ ] ... (to be continued)