# 🚀 AI Models Quick Reference Card

## 🎯 **Best Models for Coursebook Platform**

### **📊 Embedding Models (Text Vectorization)**
```env
# Fast & Efficient (384 dim)
EMBEDDING_MODEL_PRIMARY=sentence-transformers/all-MiniLM-L6-v2

# High Quality (768 dim)  
EMBEDDING_MODEL_HIGH_QUALITY=sentence-transformers/all-mpnet-base-v2

# RAG Optimized (384 dim)
EMBEDDING_MODEL_RAG=BAAI/bge-small-en-v1.5

# Multilingual (512 dim)
EMBEDDING_MODEL_MULTILINGUAL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
```

### **💬 Chat & Text Generation**
```env
# Quick Responses (117M params)
TEXT_GEN_MODEL_SMALL=microsoft/DialoGPT-small

# Balanced (345M params)
TEXT_GEN_MODEL_MEDIUM=microsoft/DialoGPT-medium

# High Quality (774M params)
TEXT_GEN_MODEL_LARGE=microsoft/DialoGPT-large

# Educational Chat
CHAT_MODEL_EDUCATION=facebook/blenderbot-400M-distill
```

### **❓ Question Answering**
```env
# Fast Q&A
QA_MODEL_FAST=distilbert-base-cased-distilled-squad

# High Accuracy
QA_MODEL_ACCURATE=deepset/roberta-base-squad2

# Educational Q&A
QA_MODEL_EDUCATION=deepset/bert-base-cased-squad2
```

### **📝 Text Summarization**
```env
# Fast Summarization
SUMMARIZATION_MODEL_FAST=facebook/bart-large-cnn

# High Quality
SUMMARIZATION_MODEL_QUALITY=google/pegasus-xsum

# Educational Content
SUMMARIZATION_MODEL_EDUCATION=google/pegasus-cnn_dailymail
```

### **🧠 Quiz Generation**
```env
# Quiz Questions & Answers
QUIZ_GEN_MODEL=google/flan-t5-base

# Quick Question Generation
QUESTION_GEN_MODEL=google/flan-t5-small

# Answer Generation
ANSWER_GEN_MODEL=google/flan-t5-base
```

### **🏷️ Text Classification**
```env
# Subject Classification
SUBJECT_CLASSIFIER=cardiffnlp/twitter-roberta-base-emotion

# Difficulty Classification
DIFFICULTY_CLASSIFIER=cardiffnlp/twitter-roberta-base-sentiment-latest

# Content Type Classification
CONTENT_TYPE_CLASSIFIER=cardiffnlp/twitter-roberta-base-sentiment-latest
```

### **🌐 Translation (Multilingual)**
```env
# English → Hindi
TRANSLATION_EN_HI=Helsinki-NLP/opus-mt-en-hi

# Hindi → English
TRANSLATION_HI_EN=Helsinki-NLP/opus-mt-hi-en

# Multiple Languages → English
TRANSLATION_MULTILINGUAL=Helsinki-NLP/opus-mt-mul-en
```

## ⚡ **Quick Setup Commands**

### **1. Run Setup Script**
```bash
node setup-ai-models.js
```

### **2. Get Hugging Face API Key**
```bash
# Visit: https://huggingface.co/settings/tokens
# Create token with "Read" permissions
# Add to .env: HUGGINGFACE_API_KEY=hf_your_token_here
```

### **3. Test Models**
```bash
# Test embedding generation
curl -X POST http://localhost:3001/api/embedding/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "What is photosynthesis?"}'

# Switch to high-quality model
curl -X POST http://localhost:3001/api/embedding/switch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"modelName": "sentence-transformers/all-mpnet-base-v2"}'
```

## 🎯 **Recommended Configurations**

### **Development (Fast)**
```env
DEFAULT_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
DEFAULT_TEXT_GEN_MODEL=microsoft/DialoGPT-small
DEFAULT_QA_MODEL=distilbert-base-cased-distilled-squad
DEFAULT_SUMMARIZATION_MODEL=facebook/bart-large-cnn
```

### **Production (Balanced)**
```env
DEFAULT_EMBEDDING_MODEL=sentence-transformers/all-mpnet-base-v2
DEFAULT_TEXT_GEN_MODEL=microsoft/DialoGPT-medium
DEFAULT_QA_MODEL=deepset/roberta-base-squad2
DEFAULT_SUMMARIZATION_MODEL=google/pegasus-xsum
```

### **High-Quality (Best Accuracy)**
```env
DEFAULT_EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
DEFAULT_TEXT_GEN_MODEL=microsoft/DialoGPT-large
DEFAULT_QA_MODEL=deepset/bert-base-cased-squad2
DEFAULT_SUMMARIZATION_MODEL=google/pegasus-cnn_dailymail
```

## 📊 **Performance Comparison**

| Task | Fast Model | Quality Model | Best Model |
|------|------------|---------------|------------|
| **Embeddings** | all-MiniLM-L6-v2 | all-mpnet-base-v2 | bge-small-en-v1.5 |
| **Text Gen** | DialoGPT-small | DialoGPT-medium | DialoGPT-large |
| **Q&A** | distilbert-squad | roberta-squad2 | bert-squad2 |
| **Summarization** | bart-cnn | pegasus-xsum | pegasus-cnn |

## 💰 **Cost & Limits**

### **Hugging Face Free Tier**
- ✅ **30,000 requests/month**
- ✅ **No credit card required**
- ✅ **Perfect for development & small production**

### **Usage Estimation**
- **PDF Processing**: ~100 embeddings per PDF
- **Quiz Generation**: ~10 text generations per quiz
- **Q&A Sessions**: ~50 Q&A requests per session
- **Monthly Capacity**: ~300 PDFs + 3,000 quizzes + 600 Q&A sessions

## 🔧 **Performance Settings**

```env
# Batch Processing
EMBEDDING_BATCH_SIZE=32
TEXT_GEN_MAX_LENGTH=512
QA_MAX_LENGTH=256
SUMMARIZATION_MAX_LENGTH=150

# Caching
CACHE_EMBEDDINGS=true
CACHE_TTL=3600
CACHE_GENERATED_CONTENT=true
CACHE_CONTENT_TTL=1800

# Rate Limiting
RATE_LIMIT_EMBEDDINGS=100
RATE_LIMIT_TEXT_GEN=50
RATE_LIMIT_QA=100
RATE_LIMIT_SUMMARIZATION=30
```

## 🚨 **Troubleshooting**

### **Common Issues**
```bash
# Check service status
curl -X GET http://localhost:3001/api/embedding/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test with sample text
curl -X POST http://localhost:3001/api/embedding/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test embedding generation"}'
```

### **Fallback System**
- ✅ **Automatic fallback** to local models when API fails
- ✅ **No API key** = uses local TF-IDF embeddings
- ✅ **Rate limit exceeded** = switches to local models
- ✅ **Network issues** = continues with local models

## 🎉 **Benefits**

✅ **30+ Free AI Models** for all use cases  
✅ **Multilingual Support** for global accessibility  
✅ **High-Quality Embeddings** for semantic search  
✅ **Educational Chatbots** for student interaction  
✅ **Quiz Generation** for assessment creation  
✅ **Content Summarization** for study aids  
✅ **Question Answering** for instant help  
✅ **Text Classification** for content organization  
✅ **Translation Support** for diverse languages  
✅ **Automatic Fallbacks** for reliability  

## 🚀 **Quick Start**

1. **Run setup**: `node setup-ai-models.js`
2. **Get API key**: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
3. **Start server**: `npm run dev`
4. **Test models**: `node test-llm-embeddings.js`

**Your coursebook platform now has AI superpowers! 🎓✨**
