#!/usr/bin/env node

/**
 * Test script for RAG & Chat Service improvements
 * Tests type safety, error handling, validation, performance, SSE streaming, multi-PDF, citations, and history limits
 */

const axios = require('axios');
const readline = require('readline');

const BASE_URL = 'http://localhost:3001/api';
let authToken = '';
let chatId = '';
let pdfId = '';
let secondPdfId = '';

// Sleep helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Test data
const testUser = {
  email: 'admin@example.com',
  password: 'Admin@123'
};

async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ ${method} ${endpoint} failed:`, error.response?.data || error.message);
    throw error;
  }
}

async function testAuth() {
  console.log('🔐 Testing authentication...');
  
  const response = await makeRequest('POST', '/auth/login', testUser);
  authToken = response.data.token;
  console.log('✅ Authentication successful');
  return authToken;
}

async function testGetPDFs() {
  console.log('📄 Getting available PDFs...');
  
  const response = await makeRequest('GET', '/pdfs', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (response.data.pdfs && response.data.pdfs.length > 0) {
    pdfId = response.data.pdfs[0]._id;
    if (response.data.pdfs.length > 1) {
      secondPdfId = response.data.pdfs[1]._id;
    }
    console.log(`✅ Found PDF: ${response.data.pdfs[0].originalName} (ID: ${pdfId})`);
    if (secondPdfId) console.log(`✅ Found second PDF: ${response.data.pdfs[1].originalName} (ID: ${secondPdfId})`);
    return { pdfId, secondPdfId };
  } else {
    console.log('⚠️  No PDFs found. Please upload a PDF first.');
    return null;
  }
}

async function testValidationIndependent() {
  console.log('🔍 Testing validation (independent of chat)...');
  
  // Empty PDF array (should fail)
  try {
    await makeRequest('POST', '/chats', { title: 'Test Chat', pdfIds: [] }, {
      'Authorization': `Bearer ${authToken}`
    });
    console.log('❌ Empty PDF array should have failed validation');
  } catch (error) {
    if (error.response?.data?.error?.code === 'VALIDATION_ERROR') {
      console.log('✅ Empty PDF array correctly rejected');
    } else {
      console.log('❌ Unexpected error for empty PDF array');
    }
  }

  // Too many PDFs (should fail)
  try {
    const tooManyPdfs = Array(11).fill('507f1f77bcf86cd799439011');
    await makeRequest('POST', '/chats', { title: 'Test Chat', pdfIds: tooManyPdfs }, {
      'Authorization': `Bearer ${authToken}`
    });
    console.log('❌ Too many PDFs should have failed validation');
  } catch (error) {
    if (error.response?.data?.error?.code === 'VALIDATION_ERROR') {
      console.log('✅ Too many PDFs correctly rejected');
    } else {
      console.log('❌ Unexpected error for too many PDFs');
    }
  }
}

async function createChatForScenarios(pdfIds) {
  console.log('💬 Creating chat for scenario tests...');
  const chatData = {
    title: 'Improved Test Chat',
    pdfIds
  };
  const chatResponse = await makeRequest('POST', '/chats', chatData, {
    'Authorization': `Bearer ${authToken}`
  });
  chatId = chatResponse.data.chat._id;
  console.log(`✅ Chat created: ${chatResponse.data.chat.title} (ID: ${chatId})`);
}

async function testShortMessageValidation() {
  console.log('🧪 Testing short message validation on existing chat...');
  try {
    await makeRequest('POST', `/chats/${chatId}/messages`, { message: 'Hi' }, {
      'Authorization': `Bearer ${authToken}`
    });
    console.log('❌ Short message should have failed validation');
  } catch (error) {
    if (error.response?.data?.error?.code === 'VALIDATION_ERROR') {
      console.log('✅ Short message correctly rejected');
    } else {
      console.log('❌ Unexpected error for short message');
    }
  }
}

async function testNormalFlow() {
  console.log('🔄 Testing normal chat flow...');
  const messageResponse = await makeRequest('POST', `/chats/${chatId}/messages`, {
    message: 'What is this document about? Please provide a detailed explanation.',
    streaming: false
  }, {
    'Authorization': `Bearer ${authToken}`
  });
  console.log(`✅ Message sent successfully`);
  console.log(`📚 Response length: ${messageResponse.data.answer?.length || 0} characters`);
  console.log(`📖 Citations: ${messageResponse.data.citations?.length || 0}`);
  return messageResponse.data;
}

async function testStreaming() {
  console.log('🌊 Testing SSE streaming response...');
  const url = `${BASE_URL}/chats/${chatId}/messages`;
  const res = await axios({
    method: 'post',
    url,
    data: { message: 'Stream a concise summary of the main topic.', streaming: true },
    headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
    responseType: 'stream'
  });

  return new Promise((resolve, reject) => {
    let received = '';
    const rl = readline.createInterface({ input: res.data });
    rl.on('line', (line) => {
      if (!line.startsWith('data:')) return;
      const payload = line.slice(5).trim();
      try {
        const obj = JSON.parse(payload);
        if (obj.chunk) received += obj.chunk;
        if (obj.done) {
          rl.close();
        }
        if (obj.error) {
          rl.close();
          reject(new Error(obj.error));
        }
      } catch {}
    });
    rl.on('close', () => {
      console.log(`✅ Stream received (${received.length} chars)`);
      resolve(received);
    });
    rl.on('error', reject);
  });
}

function validateCitations(data) {
  if (!data || !Array.isArray(data.citations)) return false;
  for (const c of data.citations) {
    if (!c.pdfId || typeof c.pageNumber !== 'number' || !c.snippet) return false;
  }
  return true;
}

async function testCitations() {
  console.log('📑 Testing citations extraction...');
  const res = await makeRequest('POST', `/chats/${chatId}/messages`, {
    message: 'Cite the page number where the main concept is introduced.',
    streaming: false
  }, { 'Authorization': `Bearer ${authToken}` });
  const ok = validateCitations(res.data || res);
  console.log(ok ? '✅ Citations structure valid' : '⚠️  Citations missing or structure invalid (model-dependent)');
}

async function testCaching() {
  console.log('💾 Testing caching performance...');
  const startTime = Date.now();
  await makeRequest('GET', `/chats/${chatId}`, null, { 'Authorization': `Bearer ${authToken}` });
  const firstRequestTime = Date.now() - startTime;
  const cacheStartTime = Date.now();
  await makeRequest('GET', `/chats/${chatId}`, null, { 'Authorization': `Bearer ${authToken}` });
  const cacheRequestTime = Date.now() - cacheStartTime;
  console.log(`📊 First request: ${firstRequestTime}ms`);
  console.log(`📊 Cached request: ${cacheRequestTime}ms`);
  if (cacheRequestTime < firstRequestTime) console.log('✅ Caching appears to be working');
}

async function testRateLimiting() {
  console.log('⏱️  Testing rate limiting...');
  let rateLimitHit = false;
  for (let i = 0; i < 12; i++) {
    try {
      await makeRequest('POST', `/chats/${chatId}/messages`, { 
        message: `Test message ${i + 1} for rate limiting` 
      }, { 'Authorization': `Bearer ${authToken}` });
    } catch (error) {
      if (error.response?.data?.error?.code === 'MESSAGE_RATE_LIMIT_EXCEEDED') {
        console.log(`✅ Rate limit hit after ${i + 1} messages`);
        rateLimitHit = true;
        break;
      }
    }
  }
  if (!rateLimitHit) console.log('⚠️  Rate limiting may not be triggered (or limits not reached)');
}

async function testErrorHandling() {
  console.log('🚨 Testing error handling...');
  // Invalid chat ID should be rejected by validator as VALIDATION_ERROR
  try {
    await makeRequest('GET', '/chats/invalid-id', null, { 'Authorization': `Bearer ${authToken}` });
    console.log('❌ Invalid chat ID should have failed');
  } catch (error) {
    if (error.response?.data?.error?.code === 'VALIDATION_ERROR') {
      console.log('✅ Invalid chat ID correctly rejected by validator');
    } else {
      console.log('❌ Unexpected error for invalid chat ID');
    }
  }
  // Non-existent valid ObjectId
  try {
    await makeRequest('GET', '/chats/507f1f77bcf86cd799439011', null, { 'Authorization': `Bearer ${authToken}` });
    console.log('❌ Non-existent chat should have failed');
  } catch (error) {
    if (error.response?.data?.error?.code === 'CHAT_NOT_FOUND') {
      console.log('✅ Non-existent chat correctly handled');
    } else {
      console.log('❌ Unexpected error for non-existent chat');
    }
  }
}

async function testHistoryLoad() {
  console.log('🧵 Testing chat history load (25 messages)...');
  // Send in batches to avoid rate limiting: 5 messages, wait 65s, repeat
  const batches = 5;
  const perBatch = 5;
  for (let b = 0; b < batches; b++) {
    for (let i = 0; i < perBatch; i++) {
      const idx = b * perBatch + i + 1;
      await makeRequest('POST', `/chats/${chatId}/messages`, { 
        message: `History test message #${idx}`,
        streaming: false
      }, { 'Authorization': `Bearer ${authToken}` });
    }
    if (b < batches - 1) {
      console.log('⏳ Waiting 65s between batches to avoid rate limit...');
      await sleep(65000);
    }
  }
  console.log('✅ 25 messages sent without overflow');
}

async function testMultiPDF() {
  if (!secondPdfId) {
    console.log('ℹ️  Skipping multi-PDF test (only one PDF available)');
    return;
  }
  console.log('🗂️  Testing multi-PDF chat...');
  const create = await makeRequest('POST', '/chats', {
    title: 'Multi-PDF Chat',
    pdfIds: [pdfId, secondPdfId]
  }, { 'Authorization': `Bearer ${authToken}` });
  const mpChatId = create.data.chat._id;
  const msg = await makeRequest('POST', `/chats/${mpChatId}/messages`, {
    message: 'Compare content across both documents and summarize differences.',
    streaming: false
  }, { 'Authorization': `Bearer ${authToken}` });
  console.log('✅ Multi-PDF message processed');
  // Cleanup
  await makeRequest('DELETE', `/chats/${mpChatId}`, null, { 'Authorization': `Bearer ${authToken}` });
}

async function cleanup() {
  if (!chatId) return;
  await makeRequest('DELETE', `/chats/${chatId}`, null, { 'Authorization': `Bearer ${authToken}` });
  console.log('✅ Test chat cleaned up');
}

async function runTests() {
  console.log('🚀 Starting RAG & Chat Service Full Test Suite\n');
  try {
    await testAuth();
    console.log('');
    await testGetPDFs();
    console.log('');
    await testValidationIndependent();
    console.log('');
    await createChatForScenarios([pdfId]);
    console.log('');
    await testShortMessageValidation();
    console.log('');
    const nonStreaming = await testNormalFlow();
    console.log('');
    await testStreaming();
    console.log('');
    await testCitations();
    console.log('');
    await testCaching();
    console.log('');
    await testRateLimiting();
    console.log('');
    // Wait for rate limit window to reset (configured ~60s). Add buffer.
    console.log('⏳ Waiting for rate limit window to reset...');
    await sleep(65000);
    console.log('✅ Rate limit window reset');
    await testErrorHandling();
    console.log('');
    await testHistoryLoad();
    console.log('');
    await testMultiPDF();
    console.log('');
    await cleanup();
    console.log('');
    console.log('🎉 All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    try { await cleanup(); } catch {}
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try { await axios.get('http://localhost:3001/health'); return true; } catch { return false; }
}

async function main() {
  console.log('🔍 Checking if server is running...');
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error('❌ Server is not running. Please start the server first:');
    console.error('   npm run dev');
    process.exit(1);
  }
  console.log('✅ Server is running\n');
  await runTests();
}

main().catch(console.error);
