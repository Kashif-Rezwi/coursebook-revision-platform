const { addPDFProcessingJob, getPDFJobStatus } = require('./dist/queues/pdfProcessingQueue');
const { addQuizGenerationJob, getQuizJobStatus } = require('./dist/queues/quizGenerationQueue');
const { connectDB } = require('./dist/config/database');

async function testPDFQueue() {
  console.log('🧪 Testing PDF Processing Queue...');
  
  try {
    // Create a temporary test file
    const fs = require('fs');
    const testFilePath = './test-upload.pdf';
    fs.writeFileSync(testFilePath, 'Mock PDF content for testing');
    
    const job = await addPDFProcessingJob({
      pdfId: '507f1f77bcf86cd799439011',
      userId: '507f1f77bcf86cd799439012',
      filePath: testFilePath,
      fileSize: 2000000
    });
    
    console.log('✅ PDF Job added:', job.id);
    
    // Wait for job to complete
    await job.finished();
    console.log('✅ PDF Job completed successfully!');
    
    // Check job status
    const status = await getPDFJobStatus(job.id);
    console.log('📊 PDF Job Status:', {
      id: status.id,
      state: status.state,
      progress: status.progress,
      result: status.returnvalue
    });
    
    // Clean up test file
    try {
      fs.unlinkSync(testFilePath);
    } catch (cleanupError) {
      console.warn('⚠️  Could not clean up test file:', cleanupError.message);
    }
    
    return true;
  } catch (error) {
    console.error('❌ PDF Queue test failed:', error.message);
    return false;
  }
}

async function testQuizQueue() {
  console.log('🧪 Testing Quiz Generation Queue...');
  
  try {
    const job = await addQuizGenerationJob({
      quizId: '507f1f77bcf86cd799439013',
      userId: '507f1f77bcf86cd799439012',
      pdfId: '507f1f77bcf86cd799439011',
      options: {
        mcqCount: 5,
        saqCount: 3,
        laqCount: 2,
        difficulty: 'medium'
      }
    });
    
    console.log('✅ Quiz Job added:', job.id);
    
    // Wait for job to complete
    await job.finished();
    console.log('✅ Quiz Job completed successfully!');
    
    // Check job status
    const status = await getQuizJobStatus(job.id);
    console.log('📊 Quiz Job Status:', {
      id: status.id,
      state: status.state,
      progress: status.progress,
      result: status.returnvalue
    });
    
    return true;
  } catch (error) {
    console.error('❌ Quiz Queue test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Background Job Queue Tests...\n');
  
  try {
    await connectDB();
    console.log('✅ Database connected successfully\n');
    
    const pdfResult = await testPDFQueue();
    console.log('');
    
    const quizResult = await testQuizQueue();
    console.log('');
    
    if (pdfResult && quizResult) {
      console.log('🎉 All tests passed! Background Job Queue is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Check the logs above for details.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Test setup failed:', error);
    process.exit(1);
  }
}

runTests();
