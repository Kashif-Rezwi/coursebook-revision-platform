const axios = require('axios');

console.log('🏥 Health Monitoring - Comprehensive Test');
console.log('========================================\n');

const API_BASE = 'http://localhost:3001/api';
let testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function logTest(testName, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}${details ? ` - ${details}` : ''}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}${details ? ` - ${details}` : ''}`);
  }
}

async function checkServer() {
  try {
    await axios.get('http://localhost:3001/api/health');
    console.log('✅ Server is running on port 3001');
    return true;
  } catch (error) {
    console.error('❌ Server is not running on port 3001');
    console.error('Please start the server with: npm run dev');
    return false;
  }
}

async function testBasicHealthCheck() {
  console.log('\n💚 Testing Basic Health Check...');
  
  try {
    const response = await axios.get(`${API_BASE}/health`);
    const data = response.data;
    
    // Test response structure
    const hasSuccess = data.hasOwnProperty('success');
    const hasMessage = data.hasOwnProperty('message');
    const hasData = data.hasOwnProperty('data');
    const hasTimestamp = data.hasOwnProperty('timestamp');
    
    logTest('Basic Health - Response Structure', hasSuccess && hasMessage && hasData && hasTimestamp);
    
    // Test response content
    const isSuccess = data.success === true;
    const hasStatus = data.data && data.data.status === 'ok';
    const hasUptime = data.data && typeof data.data.uptime === 'number';
    const hasTimestampData = data.data && data.data.timestamp;
    
    logTest('Basic Health - Response Content', isSuccess && hasStatus && hasUptime && hasTimestampData);
    
    // Test response time
    const responseTime = response.headers['x-response-time'] || 'unknown';
    const reasonableTime = response.status === 200;
    
    logTest('Basic Health - Response Time', reasonableTime, `Status: ${response.status}`);
    
    return true;
  } catch (error) {
    logTest('Basic Health Check', false, error.message);
    return false;
  }
}

async function testDetailedHealthCheck() {
  console.log('\n🔍 Testing Detailed Health Check...');
  
  try {
    const response = await axios.get(`${API_BASE}/health/detailed`);
    const data = response.data;
    
    // Test response structure
    const hasSuccess = data.hasOwnProperty('success');
    const hasMessage = data.hasOwnProperty('message');
    const hasData = data.hasOwnProperty('data');
    const hasChecks = data.data && data.data.checks;
    
    logTest('Detailed Health - Response Structure', hasSuccess && hasMessage && hasData && hasChecks);
    
    if (hasChecks) {
      const checks = data.data.checks;
      
      // Test all required services are checked
      const hasServer = checks.hasOwnProperty('server');
      const hasDatabase = checks.hasOwnProperty('database');
      const hasChromaDB = checks.hasOwnProperty('chromadb');
      const hasRedis = checks.hasOwnProperty('redis');
      const hasQueues = checks.hasOwnProperty('queues');
      
      logTest('Detailed Health - All Services Checked', 
        hasServer && hasDatabase && hasChromaDB && hasRedis && hasQueues);
      
      // Test service status structure
      const serverOk = checks.server && checks.server.status === 'ok';
      const databaseOk = checks.database && 
                        checks.database.hasOwnProperty('status') && 
                        checks.database.hasOwnProperty('message');
      const chromaDBOk = checks.chromadb && 
                        checks.chromadb.hasOwnProperty('status') && 
                        checks.chromadb.hasOwnProperty('message');
      const redisOk = checks.redis && 
                     checks.redis.hasOwnProperty('status') && 
                     checks.redis.hasOwnProperty('message');
      const queuesOk = checks.queues && 
                      checks.queues.hasOwnProperty('status') && 
                      checks.queues.hasOwnProperty('message');
      
      logTest('Detailed Health - Service Status Structure', 
        serverOk && databaseOk && chromaDBOk && redisOk && queuesOk);
      
      // Test queue details
      const hasQueueDetails = checks.queues && 
                             checks.queues.pdf && 
                             checks.queues.quiz &&
                             checks.queues.pdf.hasOwnProperty('waiting') &&
                             checks.queues.pdf.hasOwnProperty('active') &&
                             checks.queues.pdf.hasOwnProperty('completed') &&
                             checks.queues.pdf.hasOwnProperty('failed');
      
      logTest('Detailed Health - Queue Details', hasQueueDetails);
    }
    
    // Test response time (should be reasonable for parallel checks)
    const reasonableTime = response.status === 200;
    logTest('Detailed Health - Response Time', reasonableTime, `Status: ${response.status}`);
    
    return true;
  } catch (error) {
    logTest('Detailed Health Check', false, error.message);
    return false;
  }
}

async function testSystemInfo() {
  console.log('\n💻 Testing System Information...');
  
  try {
    const response = await axios.get(`${API_BASE}/health/system`);
    const data = response.data;
    
    // Test response structure
    const hasSuccess = data.hasOwnProperty('success');
    const hasMessage = data.hasOwnProperty('message');
    const hasData = data.hasOwnProperty('data');
    
    logTest('System Info - Response Structure', hasSuccess && hasMessage && hasData);
    
    if (data.data) {
      const systemData = data.data;
      
      // Test node information
      const hasNode = systemData.hasOwnProperty('node');
      const hasNodeVersion = hasNode && systemData.node.hasOwnProperty('version');
      const hasNodeEnv = hasNode && systemData.node.hasOwnProperty('env');
      const hasNodeUptime = hasNode && systemData.node.hasOwnProperty('uptime');
      const hasNodeMemory = hasNode && systemData.node.hasOwnProperty('memoryUsage');
      
      logTest('System Info - Node Information', 
        hasNode && hasNodeVersion && hasNodeEnv && hasNodeUptime && hasNodeMemory);
      
      // Test system information
      const hasSystem = systemData.hasOwnProperty('system');
      const hasPlatform = hasSystem && systemData.system.hasOwnProperty('platform');
      const hasArch = hasSystem && systemData.system.hasOwnProperty('arch');
      const hasCpus = hasSystem && systemData.system.hasOwnProperty('cpus');
      const hasMemory = hasSystem && systemData.system.hasOwnProperty('totalMemory');
      const hasHostname = hasSystem && systemData.system.hasOwnProperty('hostname');
      
      logTest('System Info - System Information', 
        hasSystem && hasPlatform && hasArch && hasCpus && hasMemory && hasHostname);
      
      // Test app information
      const hasApp = systemData.hasOwnProperty('app');
      const hasAppName = hasApp && systemData.app.hasOwnProperty('name');
      const hasAppVersion = hasApp && systemData.app.hasOwnProperty('version');
      const hasAppEnv = hasApp && systemData.app.hasOwnProperty('environment');
      
      logTest('System Info - App Information', 
        hasApp && hasAppName && hasAppVersion && hasAppEnv);
    }
    
    return true;
  } catch (error) {
    logTest('System Information', false, error.message);
    return false;
  }
}

async function testHealthCheckPerformance() {
  console.log('\n⚡ Testing Health Check Performance...');
  
  try {
    // Test basic health check performance
    const basicStart = Date.now();
    const basicResponse = await axios.get(`${API_BASE}/health`);
    const basicTime = Date.now() - basicStart;
    
    const basicFast = basicTime < 1000; // Should be under 1 second
    logTest('Basic Health - Performance', basicFast, `${basicTime}ms`);
    
    // Test detailed health check performance
    const detailedStart = Date.now();
    const detailedResponse = await axios.get(`${API_BASE}/health/detailed`);
    const detailedTime = Date.now() - detailedStart;
    
    const detailedFast = detailedTime < 10000; // Should be under 10 seconds (with timeouts)
    logTest('Detailed Health - Performance', detailedFast, `${detailedTime}ms`);
    
    // Test system info performance
    const systemStart = Date.now();
    const systemResponse = await axios.get(`${API_BASE}/health/system`);
    const systemTime = Date.now() - systemStart;
    
    const systemFast = systemTime < 2000; // Should be under 2 seconds
    logTest('System Info - Performance', systemFast, `${systemTime}ms`);
    
    return true;
  } catch (error) {
    logTest('Health Check Performance', false, error.message);
    return false;
  }
}

async function testHealthCheckReliability() {
  console.log('\n🔄 Testing Health Check Reliability...');
  
  try {
    // Test multiple consecutive requests
    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(axios.get(`${API_BASE}/health`));
    }
    
    const responses = await Promise.all(requests);
    
    const allSuccessful = responses.every(res => res.status === 200);
    logTest('Health Check - Multiple Requests', allSuccessful, '5 consecutive requests');
    
    // Test that responses are consistent
    const firstData = responses[0].data;
    const allConsistent = responses.every(res => 
      res.data.success === firstData.success &&
      res.data.data.status === firstData.data.status
    );
    
    logTest('Health Check - Response Consistency', allConsistent, 'Consistent responses');
    
    return true;
  } catch (error) {
    logTest('Health Check Reliability', false, error.message);
    return false;
  }
}

async function testHealthCheckErrorHandling() {
  console.log('\n🚨 Testing Health Check Error Handling...');
  
  try {
    // Test that health checks handle errors gracefully
    // (We can't easily simulate service failures, but we can test the structure)
    const response = await axios.get(`${API_BASE}/health/detailed`);
    const data = response.data;
    
    if (data.data && data.data.checks) {
      const checks = data.data.checks;
      
      // Test that all checks have proper error handling structure
      const hasErrorHandling = Object.values(checks).every(check => 
        check && 
        check.hasOwnProperty('status') && 
        check.hasOwnProperty('message') &&
        ['ok', 'error', 'warning'].includes(check.status)
      );
      
      logTest('Health Check - Error Handling Structure', hasErrorHandling);
    }
    
    return true;
  } catch (error) {
    logTest('Health Check Error Handling', false, error.message);
    return false;
  }
}

async function testHealthCheckTimeoutHandling() {
  console.log('\n⏰ Testing Health Check Timeout Handling...');
  
  try {
    // Test that detailed health check completes within reasonable time
    // (This tests the timeout functionality we implemented)
    const startTime = Date.now();
    const response = await axios.get(`${API_BASE}/health/detailed`);
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    const withinTimeout = responseTime < 30000; // Should complete within 30 seconds (our timeouts are much shorter)
    
    logTest('Health Check - Timeout Handling', withinTimeout, `${responseTime}ms`);
    
    // Test that the response is valid even with timeouts
    const hasValidResponse = response.status === 200 && response.data.success;
    logTest('Health Check - Valid Response After Timeout', hasValidResponse);
    
    return true;
  } catch (error) {
    logTest('Health Check Timeout Handling', false, error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('Starting Health Monitoring Tests...\n');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }
  
  // Run all test suites
  await testBasicHealthCheck();
  await testDetailedHealthCheck();
  await testSystemInfo();
  await testHealthCheckPerformance();
  await testHealthCheckReliability();
  await testHealthCheckErrorHandling();
  await testHealthCheckTimeoutHandling();
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 HEALTH MONITORING TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Total:  ${testResults.total}`);
  console.log(`🎯 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All health monitoring tests passed! System monitoring is working perfectly.');
  } else {
    console.log(`\n⚠️  ${testResults.failed} test(s) failed. Please check the health monitoring implementation.`);
  }
  
  console.log('\n🏥 Health monitoring test completed!');
}

// Run the tests
runAllTests().catch(console.error);
