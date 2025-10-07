#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

console.log('🤖 AI Models Setup for Coursebook Revision Platform');
console.log('==================================================\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// AI Models Configuration
const aiModelsConfig = {
  // Embedding Models
  'EMBEDDING_MODEL_PRIMARY': 'sentence-transformers/all-MiniLM-L6-v2',
  'EMBEDDING_MODEL_HIGH_QUALITY': 'sentence-transformers/all-mpnet-base-v2',
  'EMBEDDING_MODEL_RAG': 'BAAI/bge-small-en-v1.5',
  'EMBEDDING_MODEL_MULTILINGUAL': 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
  
  // Text Generation Models
  'TEXT_GEN_MODEL_SMALL': 'microsoft/DialoGPT-small',
  'TEXT_GEN_MODEL_MEDIUM': 'microsoft/DialoGPT-medium',
  'TEXT_GEN_MODEL_LARGE': 'microsoft/DialoGPT-large',
  'CHAT_MODEL_EDUCATION': 'facebook/blenderbot-400M-distill',
  
  // Question Answering Models
  'QA_MODEL_FAST': 'distilbert-base-cased-distilled-squad',
  'QA_MODEL_ACCURATE': 'deepset/roberta-base-squad2',
  'QA_MODEL_EDUCATION': 'deepset/bert-base-cased-squad2',
  
  // Text Summarization Models
  'SUMMARIZATION_MODEL_FAST': 'facebook/bart-large-cnn',
  'SUMMARIZATION_MODEL_QUALITY': 'google/pegasus-xsum',
  'SUMMARIZATION_MODEL_EDUCATION': 'google/pegasus-cnn_dailymail',
  
  // Quiz Generation Models
  'QUIZ_GEN_MODEL': 'google/flan-t5-base',
  'QUESTION_GEN_MODEL': 'google/flan-t5-small',
  'ANSWER_GEN_MODEL': 'google/flan-t5-base',
  
  // Text Classification Models
  'SUBJECT_CLASSIFIER': 'cardiffnlp/twitter-roberta-base-emotion',
  'DIFFICULTY_CLASSIFIER': 'cardiffnlp/twitter-roberta-base-sentiment-latest',
  'CONTENT_TYPE_CLASSIFIER': 'cardiffnlp/twitter-roberta-base-sentiment-latest',
  
  // Text Similarity Models
  'SIMILARITY_MODEL': 'sentence-transformers/all-MiniLM-L6-v2',
  'DUPLICATE_DETECTOR': 'sentence-transformers/all-mpnet-base-v2',
  
  // Translation Models
  'TRANSLATION_EN_HI': 'Helsinki-NLP/opus-mt-en-hi',
  'TRANSLATION_HI_EN': 'Helsinki-NLP/opus-mt-hi-en',
  'TRANSLATION_MULTILINGUAL': 'Helsinki-NLP/opus-mt-mul-en',
  
  // Text Processing Models
  'NER_MODEL': 'dbmdz/bert-large-cased-finetuned-conll03-english',
  'POS_MODEL': 'dbmdz/bert-large-cased-finetuned-conll03-english',
  'TEXT_EXTRACTOR': 'dbmdz/bert-large-cased-finetuned-conll03-english',
  
  // Default Models
  'DEFAULT_EMBEDDING_MODEL': 'sentence-transformers/all-MiniLM-L6-v2',
  'DEFAULT_TEXT_GEN_MODEL': 'microsoft/DialoGPT-medium',
  'DEFAULT_QA_MODEL': 'distilbert-base-cased-distilled-squad',
  'DEFAULT_SUMMARIZATION_MODEL': 'facebook/bart-large-cnn',
  
  // Performance Settings
  'EMBEDDING_BATCH_SIZE': '32',
  'TEXT_GEN_MAX_LENGTH': '512',
  'QA_MAX_LENGTH': '256',
  'SUMMARIZATION_MAX_LENGTH': '150',
  
  // Caching
  'CACHE_EMBEDDINGS': 'true',
  'CACHE_TTL': '3600',
  'CACHE_GENERATED_CONTENT': 'true',
  'CACHE_CONTENT_TTL': '1800',
  
  // Rate Limiting
  'RATE_LIMIT_EMBEDDINGS': '100',
  'RATE_LIMIT_TEXT_GEN': '50',
  'RATE_LIMIT_QA': '100',
  'RATE_LIMIT_SUMMARIZATION': '30',
  
  // Monitoring
  'TRACK_MODEL_PERFORMANCE': 'true',
  'TRACK_USAGE_ANALYTICS': 'true',
  'MONITOR_RESPONSE_TIMES': 'true',
  
  // Fallback
  'ENABLE_FALLBACK': 'true',
  'FALLBACK_EMBEDDING_MODEL': 'local-tfidf',
  'FALLBACK_TEXT_GEN_MODEL': 'local-simple',
  
  // Development
  'DEBUG_AI_MODELS': 'false',
  'ENABLE_MODEL_TESTING': 'true',
  'MOCK_AI_RESPONSES': 'false'
};

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function setupAIModels() {
  console.log('This script will help you set up AI models for your coursebook platform.\n');
  
  // Check if .env file exists
  const envPath = path.join(__dirname, '.env');
  const envExists = fs.existsSync(envPath);
  
  if (envExists) {
    console.log('✅ Found existing .env file');
    const overwrite = await askQuestion('Do you want to add AI model configurations to your existing .env file? (y/n): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('❌ Setup cancelled');
      rl.close();
      return;
    }
  }
  
  // Ask for Hugging Face API key
  console.log('\n🔑 Hugging Face API Key Setup');
  console.log('=============================');
  console.log('To use AI models, you need a free Hugging Face API key.');
  console.log('Get yours at: https://huggingface.co/settings/tokens\n');
  
  const hasApiKey = await askQuestion('Do you have a Hugging Face API key? (y/n): ');
  let apiKey = '';
  
  if (hasApiKey.toLowerCase() === 'y') {
    apiKey = await askQuestion('Enter your Hugging Face API key: ');
  } else {
    console.log('⚠️  You can add your API key later to the .env file');
    console.log('   The system will use local embeddings without an API key\n');
  }
  
  // Ask for model preferences
  console.log('🎯 Model Selection');
  console.log('==================');
  console.log('Choose your preferred model configuration:\n');
  console.log('1. Development (Fast, lightweight models)');
  console.log('2. Production (Balanced performance and quality)');
  console.log('3. High-Quality (Best accuracy, slower)');
  console.log('4. Custom (Choose your own models)\n');
  
  const configChoice = await askQuestion('Select configuration (1-4): ');
  
  let selectedConfig = {};
  
  switch (configChoice) {
    case '1': // Development
      selectedConfig = {
        'DEFAULT_EMBEDDING_MODEL': 'sentence-transformers/all-MiniLM-L6-v2',
        'DEFAULT_TEXT_GEN_MODEL': 'microsoft/DialoGPT-small',
        'DEFAULT_QA_MODEL': 'distilbert-base-cased-distilled-squad',
        'DEFAULT_SUMMARIZATION_MODEL': 'facebook/bart-large-cnn'
      };
      console.log('✅ Selected: Development configuration (fast models)');
      break;
      
    case '2': // Production
      selectedConfig = {
        'DEFAULT_EMBEDDING_MODEL': 'sentence-transformers/all-mpnet-base-v2',
        'DEFAULT_TEXT_GEN_MODEL': 'microsoft/DialoGPT-medium',
        'DEFAULT_QA_MODEL': 'deepset/roberta-base-squad2',
        'DEFAULT_SUMMARIZATION_MODEL': 'google/pegasus-xsum'
      };
      console.log('✅ Selected: Production configuration (balanced)');
      break;
      
    case '3': // High-Quality
      selectedConfig = {
        'DEFAULT_EMBEDDING_MODEL': 'BAAI/bge-small-en-v1.5',
        'DEFAULT_TEXT_GEN_MODEL': 'microsoft/DialoGPT-large',
        'DEFAULT_QA_MODEL': 'deepset/bert-base-cased-squad2',
        'DEFAULT_SUMMARIZATION_MODEL': 'google/pegasus-cnn_dailymail'
      };
      console.log('✅ Selected: High-Quality configuration (best accuracy)');
      break;
      
    case '4': // Custom
      console.log('🔧 Custom configuration selected');
      console.log('You can modify the models in the generated .env file');
      break;
      
    default:
      console.log('⚠️  Invalid choice, using development configuration');
      selectedConfig = {
        'DEFAULT_EMBEDDING_MODEL': 'sentence-transformers/all-MiniLM-L6-v2',
        'DEFAULT_TEXT_GEN_MODEL': 'microsoft/DialoGPT-small',
        'DEFAULT_QA_MODEL': 'distilbert-base-cased-distilled-squad',
        'DEFAULT_SUMMARIZATION_MODEL': 'facebook/bart-large-cnn'
      };
  }
  
  // Generate .env content
  let envContent = '';
  
  if (envExists) {
    // Read existing .env file
    const existingContent = fs.readFileSync(envPath, 'utf8');
    envContent = existingContent;
    
    // Add separator if not present
    if (!envContent.includes('# ===========================================')) {
      envContent += '\n\n# ===========================================\n';
    }
  } else {
    // Create new .env file with basic structure
    envContent = `# ===========================================
# COURSEBOOK REVISION PLATFORM
# ===========================================

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/coursebook-revision-platform
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
JWT_EXPIRE=7d

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ChromaDB Configuration
CHROMADB_HOST=localhost
CHROMADB_PORT=8000

# File Upload Configuration
FILE_UPLOAD_PATH=./uploads
MAX_FILE_SIZE=52428800

# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info

`;
  }
  
  // Add AI Models section
  envContent += `
# ===========================================
# AI MODELS CONFIGURATION
# ===========================================

# Hugging Face API Key
HUGGINGFACE_API_KEY=${apiKey}

# All Available AI Models
`;

  // Add all model configurations
  Object.entries(aiModelsConfig).forEach(([key, value]) => {
    envContent += `${key}=${value}\n`;
  });
  
  // Add selected configuration
  envContent += `
# Selected Configuration
`;
  Object.entries(selectedConfig).forEach(([key, value]) => {
    envContent += `# ${key}=${value}\n`;
  });
  
  // Write .env file
  fs.writeFileSync(envPath, envContent);
  
  console.log('\n🎉 AI Models Setup Complete!');
  console.log('============================');
  console.log(`✅ Created/Updated .env file: ${envPath}`);
  console.log(`✅ Added ${Object.keys(aiModelsConfig).length} AI model configurations`);
  console.log(`✅ Added ${Object.keys(selectedConfig).length} default model selections`);
  
  if (apiKey) {
    console.log('✅ Added Hugging Face API key');
  } else {
    console.log('⚠️  No API key added - system will use local embeddings');
  }
  
  console.log('\n📚 Next Steps:');
  console.log('==============');
  console.log('1. Review the .env file and adjust settings as needed');
  console.log('2. Start your server: npm run dev');
  console.log('3. Test the AI models: node test-llm-embeddings.js');
  console.log('4. Check the AI_MODELS_CONFIG.md for detailed documentation');
  
  console.log('\n🔗 Useful Links:');
  console.log('================');
  console.log('• Hugging Face Models: https://huggingface.co/models');
  console.log('• Get API Key: https://huggingface.co/settings/tokens');
  console.log('• Documentation: AI_MODELS_CONFIG.md');
  
  console.log('\n🚀 Your coursebook platform is ready with AI superpowers!');
  
  rl.close();
}

// Run the setup
setupAIModels().catch(console.error);
