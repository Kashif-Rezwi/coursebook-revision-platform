const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 API Gateway & Routes - Master Test Suite');
console.log('==========================================\n');

const testFiles = [
  { name: 'API Gateway Integration', file: 'test-api-gateway.js' },
  { name: 'Rate Limiting', file: 'test-rate-limiting.js' },
  { name: 'Health Monitoring', file: 'test-health-monitoring.js' },
  { name: 'API Statistics', file: 'test-api-statistics.js' }
];

let testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

async function runTest(testName, testFile) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Running ${testName} Tests...`);
    console.log('='.repeat(50));
    
    const testProcess = spawn('node', [testFile], {
      cwd: __dirname,
      stdio: 'pipe'
    });
    
    let output = '';
    let errorOutput = '';
    
    testProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });
    
    testProcess.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      process.stderr.write(text);
    });
    
    testProcess.on('close', (code) => {
      testResults.total++;
      
      if (code === 0) {
        testResults.passed++;
        console.log(`\n✅ ${testName} Tests: PASSED\n`);
      } else {
        testResults.failed++;
        console.log(`\n❌ ${testName} Tests: FAILED (Exit code: ${code})\n`);
      }
      
      resolve({ name: testName, code, output, errorOutput });
    });
    
    testProcess.on('error', (error) => {
      testResults.total++;
      testResults.failed++;
      console.log(`\n❌ ${testName} Tests: ERROR - ${error.message}\n`);
      resolve({ name: testName, code: 1, output, errorOutput: error.message });
    });
  });
}

async function checkServer() {
  try {
    const axios = require('axios');
    await axios.get('http://localhost:3001/api/health');
    console.log('✅ Server is running on port 3001');
    return true;
  } catch (error) {
    console.error('❌ Server is not running on port 3001');
    console.error('Please start the server with: npm run dev');
    return false;
  }
}

async function runAllTests() {
  console.log('Starting API Gateway & Routes Master Test Suite...\n');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }
  
  console.log('📋 Test Suite Overview:');
  testFiles.forEach((test, index) => {
    console.log(`   ${index + 1}. ${test.name} (${test.file})`);
  });
  
  console.log('\n🚀 Starting test execution...\n');
  
  // Run all tests sequentially
  for (const test of testFiles) {
    await runTest(test.name, test.file);
    
    // Add a small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Print final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 MASTER TEST SUITE SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Total:  ${testResults.total}`);
  console.log(`🎯 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! API Gateway & Routes is working perfectly.');
    console.log('🚀 Ready for production deployment!');
  } else {
    console.log(`\n⚠️  ${testResults.failed} test suite(s) failed. Please check the implementation.`);
    console.log('🔧 Review the failed tests above for details.');
  }
  
  console.log('\n📋 Test Files Created:');
  testFiles.forEach((test, index) => {
    console.log(`   ${index + 1}. ${test.file} - ${test.name} tests`);
  });
  
  console.log('\n🔧 To run individual tests:');
  testFiles.forEach((test) => {
    console.log(`   node ${test.file}`);
  });
  
  console.log('\n🚀 API Gateway & Routes test suite completed!');
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test suite interrupted by user');
  console.log(`📊 Partial Results: ${testResults.passed}/${testResults.total} passed`);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Test suite terminated');
  console.log(`📊 Partial Results: ${testResults.passed}/${testResults.total} passed`);
  process.exit(1);
});

// Run the master test suite
runAllTests().catch((error) => {
  console.error('\n❌ Master test suite failed:', error.message);
  process.exit(1);
});
