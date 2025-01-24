import express from 'express';
import cors from 'cors';
import { createSession } from './bb.js';
import { agentLoop } from './index.js';
import { EventEmitter } from 'events';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.post('/agent/start', async (req, res) => {
    const session = await createSession();
    const emitter = new EventEmitter();
    
    // Setup SSE first
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Start agent loop without emitter as last param
    const result = await agentLoop(session.id, req.body.goal, []);
    
    // Emit the result
    emitter.emit('step', result);
    res.write(`data: ${JSON.stringify(result)}\n\n`);
});

app.post('/agent', async (req, res) => {
    try {
      const { goal, previousSteps, sessionId, previousExtraction } = req.body;
      console.log('Received request:', { goal, previousSteps, sessionId, previousExtraction });
      
      if (!goal) {
        throw new Error('Goal is required');
      }
  
      let session;
      if (!sessionId) {
        session = await createSession();
        console.log("Created new session:", session);
      }
  
      const result = await agentLoop(
        sessionId || session?.id,
        goal,
        previousSteps,
        previousExtraction
      );
  
      console.log('Server sending response:', {
        result: result.result,
        sessionId: sessionId || session?.id,
        steps: result.steps
      });
  
      res.json({
        success: true,
        result: {
          text: result.result.text,
          reasoning: result.result.reasoning,
          tool: result.result.tool,
          instruction: result.result.instruction
        },
        sessionId: sessionId || session?.id,
        sessionUrl: `https://www.browserbase.com/sessions/${sessionId || session?.id}`,
        steps: result.steps
      });
    } catch (error) {
      console.error('Agent error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      });
    }
  });

app.post('/session', async (req, res) => {
  try {
    const session = await createSession();
    console.log("Created new session:", session);
    
    res.json({
      success: true,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create session' 
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});