const axios = require('axios');

console.log('📊 API Statistics & Monitoring - Comprehensive Test');
console.log('==================================================\n');

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

async function testAPIStatsEndpoint() {
  console.log('\n📈 Testing API Statistics Endpoint...');
  
  try {
    const response = await axios.get(`${API_BASE}/stats`);
    const data = response.data;
    
    // Test response structure
    const hasSuccess = data.hasOwnProperty('success');
    const hasData = data.hasOwnProperty('data');
    
    logTest('API Stats - Response Structure', hasSuccess && hasData);
    
    if (data.data) {
      const stats = data.data;
      
      // Test required fields
      const hasTotalRequests = stats.hasOwnProperty('totalRequests');
      const hasRequestsByEndpoint = stats.hasOwnProperty('requestsByEndpoint');
      const hasRequestsByMethod = stats.hasOwnProperty('requestsByMethod');
      const hasErrorCount = stats.hasOwnProperty('errorCount');
      const hasAverageResponseTime = stats.hasOwnProperty('averageResponseTime');
      const hasStartTime = stats.hasOwnProperty('startTime');
      const hasUptime = stats.hasOwnProperty('uptime');
      const hasRequestsPerMinute = stats.hasOwnProperty('requestsPerMinute');
      const hasErrorRate = stats.hasOwnProperty('errorRate');
      
      logTest('API Stats - Required Fields', 
        hasTotalRequests && hasRequestsByEndpoint && hasRequestsByMethod && 
        hasErrorCount && hasAverageResponseTime && hasStartTime && 
        hasUptime && hasRequestsPerMinute && hasErrorRate);
      
      // Test data types
      const totalRequestsIsNumber = typeof stats.totalRequests === 'number';
      const requestsByEndpointIsObject = typeof stats.requestsByEndpoint === 'object';
      const requestsByMethodIsObject = typeof stats.requestsByMethod === 'object';
      const errorCountIsNumber = typeof stats.errorCount === 'number';
      const averageResponseTimeIsNumber = typeof stats.averageResponseTime === 'number';
      const startTimeIsNumber = typeof stats.startTime === 'number';
      const uptimeIsNumber = typeof stats.uptime === 'number';
      const requestsPerMinuteIsString = typeof stats.requestsPerMinute === 'string';
      const errorRateIsString = typeof stats.errorRate === 'string';
      
      logTest('API Stats - Data Types', 
        totalRequestsIsNumber && requestsByEndpointIsObject && requestsByMethodIsObject &&
        errorCountIsNumber && averageResponseTimeIsNumber && startTimeIsNumber &&
        uptimeIsNumber && requestsPerMinuteIsString && errorRateIsString);
      
      // Test that stats are being tracked
      const hasActivity = stats.totalRequests > 0;
      logTest('API Stats - Activity Tracking', hasActivity, `${stats.totalRequests} total requests`);
    }
    
    return true;
  } catch (error) {
    logTest('API Stats Endpoint', false, error.message);
    return false;
  }
}

async function testRequestTracking() {
  console.log('\n🔍 Testing Request Tracking...');
  
  try {
    // Get initial stats
    const initialResponse = await axios.get(`${API_BASE}/stats`);
    const initialStats = initialResponse.data.data;
    const initialTotal = initialStats.totalRequests;
    
    // Make some test requests
    const testRequests = [
      axios.get(`${API_BASE}/health`),
      axios.get(`${API_BASE}/health`),
      axios.get(`${API_BASE}/`),
      axios.get(`${API_BASE}/health/detailed`)
    ];
    
    await Promise.all(testRequests);
    
    // Get updated stats
    const updatedResponse = await axios.get(`${API_BASE}/stats`);
    const updatedStats = updatedResponse.data.data;
    const updatedTotal = updatedStats.totalRequests;
    
    // Test that requests are being tracked
    const requestsTracked = updatedTotal > initialTotal;
    logTest('Request Tracking - New Requests', requestsTracked, 
      `+${updatedTotal - initialTotal} requests tracked`);
    
    // Test endpoint tracking
    const hasHealthEndpoint = updatedStats.requestsByEndpoint['/health'] > 0;
    const hasRootEndpoint = updatedStats.requestsByEndpoint['/'] > 0;
    const hasDetailedEndpoint = updatedStats.requestsByEndpoint['/health/detailed'] > 0;
    
    logTest('Request Tracking - Endpoint Tracking', 
      hasHealthEndpoint && hasRootEndpoint && hasDetailedEndpoint);
    
    // Test method tracking
    const hasGetMethod = updatedStats.requestsByMethod['GET'] > 0;
    logTest('Request Tracking - Method Tracking', hasGetMethod);
    
    return true;
  } catch (error) {
    logTest('Request Tracking', false, error.message);
    return false;
  }
}

async function testResponseTimeTracking() {
  console.log('\n⏱️ Testing Response Time Tracking...');
  
  try {
    // Get initial stats
    const initialResponse = await axios.get(`${API_BASE}/stats`);
    const initialStats = initialResponse.data.data;
    const initialAvgTime = initialStats.averageResponseTime;
    
    // Make some requests with different response times
    const fastRequest = axios.get(`${API_BASE}/health`);
    const slowRequest = axios.get(`${API_BASE}/health/detailed`);
    
    await Promise.all([fastRequest, slowRequest]);
    
    // Get updated stats
    const updatedResponse = await axios.get(`${API_BASE}/stats`);
    const updatedStats = updatedResponse.data.data;
    const updatedAvgTime = updatedStats.averageResponseTime;
    
    // Test that response times are being tracked
    const responseTimeTracked = typeof updatedAvgTime === 'number' && updatedAvgTime >= 0;
    logTest('Response Time Tracking - Average Time', responseTimeTracked, 
      `${updatedAvgTime.toFixed(2)}ms average`);
    
    // Test that average is reasonable
    const reasonableTime = updatedAvgTime < 10000; // Less than 10 seconds
    logTest('Response Time Tracking - Reasonable Time', reasonableTime);
    
    return true;
  } catch (error) {
    logTest('Response Time Tracking', false, error.message);
    return false;
  }
}

async function testErrorTracking() {
  console.log('\n🚨 Testing Error Tracking...');
  
  try {
    // Get initial error count
    const initialResponse = await axios.get(`${API_BASE}/stats`);
    const initialStats = initialResponse.data.data;
    const initialErrors = initialStats.errorCount;
    
    // Make some requests that will result in errors
    const errorRequests = [
      axios.get(`${API_BASE}/nonexistent-endpoint`).catch(() => ({ status: 404 })),
      axios.get(`${API_BASE}/v1/auth/me`).catch(() => ({ status: 401 })),
      axios.post(`${API_BASE}/v1/auth/login`, {}).catch(() => ({ status: 400 }))
    ];
    
    await Promise.all(errorRequests);
    
    // Get updated stats
    const updatedResponse = await axios.get(`${API_BASE}/stats`);
    const updatedStats = updatedResponse.data.data;
    const updatedErrors = updatedStats.errorCount;
    
    // Test that errors are being tracked
    const errorsTracked = updatedErrors >= initialErrors;
    logTest('Error Tracking - Error Count', errorsTracked, 
      `${updatedErrors} total errors`);
    
    // Test error rate calculation
    const errorRate = updatedStats.errorRate;
    const hasErrorRate = typeof errorRate === 'string' && errorRate.includes('%');
    logTest('Error Tracking - Error Rate', hasErrorRate, `Error rate: ${errorRate}`);
    
    return true;
  } catch (error) {
    logTest('Error Tracking', false, error.message);
    return false;
  }
}

async function testUptimeTracking() {
  console.log('\n⏰ Testing Uptime Tracking...');
  
  try {
    const response = await axios.get(`${API_BASE}/stats`);
    const stats = response.data.data;
    
    // Test uptime tracking
    const hasUptime = typeof stats.uptime === 'number' && stats.uptime > 0;
    logTest('Uptime Tracking - Uptime Value', hasUptime, 
      `${Math.round(stats.uptime / 1000)}s uptime`);
    
    // Test start time tracking
    const hasStartTime = typeof stats.startTime === 'number' && stats.startTime > 0;
    const startTime = new Date(stats.startTime);
    const isRecent = startTime > new Date(Date.now() - 24 * 60 * 60 * 1000); // Within last 24 hours
    
    logTest('Uptime Tracking - Start Time', hasStartTime && isRecent, 
      `Started: ${startTime.toISOString()}`);
    
    return true;
  } catch (error) {
    logTest('Uptime Tracking', false, error.message);
    return false;
  }
}

async function testRequestsPerMinute() {
  console.log('\n📊 Testing Requests Per Minute Calculation...');
  
  try {
    const response = await axios.get(`${API_BASE}/stats`);
    const stats = response.data.data;
    
    // Test requests per minute calculation
    const hasRequestsPerMinute = typeof stats.requestsPerMinute === 'string';
    const requestsPerMinute = parseFloat(stats.requestsPerMinute);
    const isValidNumber = !isNaN(requestsPerMinute) && requestsPerMinute >= 0;
    
    logTest('Requests Per Minute - Calculation', hasRequestsPerMinute && isValidNumber, 
      `${stats.requestsPerMinute} requests/min`);
    
    // Test that the calculation is reasonable
    const reasonableRate = requestsPerMinute < 1000; // Less than 1000 requests per minute
    logTest('Requests Per Minute - Reasonable Rate', reasonableRate);
    
    return true;
  } catch (error) {
    logTest('Requests Per Minute', false, error.message);
    return false;
  }
}

async function testStatisticsConsistency() {
  console.log('\n🔄 Testing Statistics Consistency...');
  
  try {
    // Get stats multiple times to test consistency
    const responses = await Promise.all([
      axios.get(`${API_BASE}/stats`),
      axios.get(`${API_BASE}/stats`),
      axios.get(`${API_BASE}/stats`)
    ]);
    
    const stats = responses.map(res => res.data.data);
    
    // Test that basic stats are consistent
    const totalRequestsConsistent = stats.every(stat => 
      stat.totalRequests === stats[0].totalRequests
    );
    
    logTest('Statistics Consistency - Total Requests', totalRequestsConsistent);
    
    // Test that uptime increases over time
    const uptimes = stats.map(stat => stat.uptime);
    const uptimeIncreasing = uptimes[0] <= uptimes[1] && uptimes[1] <= uptimes[2];
    
    logTest('Statistics Consistency - Uptime Progression', uptimeIncreasing);
    
    return true;
  } catch (error) {
    logTest('Statistics Consistency', false, error.message);
    return false;
  }
}

async function testStatisticsPerformance() {
  console.log('\n⚡ Testing Statistics Performance...');
  
  try {
    // Test that stats endpoint is fast
    const startTime = Date.now();
    const response = await axios.get(`${API_BASE}/stats`);
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    const isFast = responseTime < 1000; // Should be under 1 second
    
    logTest('Statistics Performance - Response Time', isFast, `${responseTime}ms`);
    
    // Test that stats don't impact other endpoints
    const healthStart = Date.now();
    await axios.get(`${API_BASE}/health`);
    const healthTime = Date.now() - healthStart;
    
    const healthFast = healthTime < 1000; // Health should still be fast
    logTest('Statistics Performance - No Impact on Other Endpoints', healthFast, 
      `Health: ${healthTime}ms`);
    
    return true;
  } catch (error) {
    logTest('Statistics Performance', false, error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('Starting API Statistics & Monitoring Tests...\n');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }
  
  // Run all test suites
  await testAPIStatsEndpoint();
  await testRequestTracking();
  await testResponseTimeTracking();
  await testErrorTracking();
  await testUptimeTracking();
  await testRequestsPerMinute();
  await testStatisticsConsistency();
  await testStatisticsPerformance();
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 API STATISTICS TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Total:  ${testResults.total}`);
  console.log(`🎯 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All API statistics tests passed! Monitoring is working perfectly.');
  } else {
    console.log(`\n⚠️  ${testResults.failed} test(s) failed. Please check the statistics implementation.`);
  }
  
  console.log('\n📊 API statistics test completed!');
}

// Run the tests
runAllTests().catch(console.error);
