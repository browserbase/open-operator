// Test script to debug the agent endpoint
const fetch = require('node-fetch');

async function testAgentEndpoint() {
  try {
    // First test - check if the endpoint is accessible
    console.log('Testing GET request to agent endpoint...');
    const getResponse = await fetch('http://localhost:3001/api/agent');
    const getResult = await getResponse.json();
    console.log('GET response:', getResult);

    // Test POST with minimal data
    console.log('\nTesting POST request to agent endpoint...');
    const postResponse = await fetch('http://localhost:3001/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'START',
        goal: 'test goal',
        sessionId: 'test-session-id'
      })
    });

    if (postResponse.ok) {
      const postResult = await postResponse.json();
      console.log('POST response:', postResult);
    } else {
      console.log('POST failed with status:', postResponse.status);
      const errorText = await postResponse.text();
      console.log('Error response:', errorText);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAgentEndpoint();
