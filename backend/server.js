// ─── Prompt402 Backend Server ─────────────────────────────────────────
// Agent 1: Backend Engineer | Agent 2: Blockchain/x402 Engineer | Agent 3: AI Integration Engineer
// All integrated into a single clean server

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 4020;

// ─── Middleware ───────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── In-Memory State ─────────────────────────────────────────────────
// Stores payment sessions: { sessionId: { paid: bool, prompt: string, cost: string, createdAt } }
const paymentSessions = new Map();

// Cost per prompt in USDC
const PROMPT_COST = '0.01';

// ─── Agent 2: x402 Payment Service ──────────────────────────────────
const paymentService = {
  /**
   * Create a new payment session for a prompt
   */
  createSession(prompt) {
    const sessionId = uuidv4();
    paymentSessions.set(sessionId, {
      paid: false,
      prompt,
      cost: PROMPT_COST,
      createdAt: Date.now(),
    });
    return sessionId;
  },

  /**
   * Verify and mark a session as paid
   * In production, this would verify an on-chain transaction
   */
  verifyPayment(sessionId) {
    const session = paymentSessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    if (session.paid) return { success: false, error: 'Already paid' };

    session.paid = true;
    session.paidAt = Date.now();
    return { success: true };
  },

  /**
   * Check if a session has been paid
   */
  isPaid(sessionId) {
    const session = paymentSessions.get(sessionId);
    return session ? session.paid : false;
  },

  /**
   * Get session data
   */
  getSession(sessionId) {
    return paymentSessions.get(sessionId) || null;
  },
};

// ─── Agent 3: AI Execution Service ───────────────────────────────────
const aiService = {
  /**
   * Execute AI prompt ONLY after payment is confirmed.
   * Returns a mock AI response simulating Claude's behavior.
   * In production, this would call Claude via MCP or API.
   */
  async executePrompt(prompt) {
    // Simulate AI processing delay (300-800ms)
    const delay = 300 + Math.random() * 500;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Generate a contextual mock response
    const responses = {
      default: `Thank you for your prompt! Here is my analysis:\n\n"${prompt}"\n\nThis is a simulated AI response from the Prompt402 system. In production, this would be powered by Claude via MCP, providing real AI-generated content. The x402 payment protocol ensures that this response was only generated after your micropayment of ${PROMPT_COST} USDC was verified on-chain.\n\n— Prompt402 AI Engine`,
    };

    return {
      response: responses.default,
      model: 'prompt402-mock-v1',
      tokens: Math.floor(50 + Math.random() * 150),
      processingTimeMs: Math.round(delay),
    };
  },
};

// ─── Agent 1: API Routes ─────────────────────────────────────────────

/**
 * POST /prompt
 * Main endpoint: Submit a prompt for AI processing.
 * If no valid paid session → returns 402 Payment Required with a new session.
 * If valid paid session → executes AI and returns response.
 */
app.post('/prompt', async (req, res) => {
  const { prompt, sessionId } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'A non-empty "prompt" field is required.',
    });
  }

  // ─── x402 Flow: Check for payment ─────────────────────────────────
  // If no sessionId or session isn't paid → 402 Payment Required
  if (!sessionId || !paymentService.isPaid(sessionId)) {
    const newSessionId = paymentService.createSession(prompt.trim());

    return res.status(402).json({
      error: 'Payment Required',
      message: 'Payment is required before AI execution.',
      payment: {
        sessionId: newSessionId,
        cost: PROMPT_COST,
        currency: 'USDC',
        network: 'Base Sepolia',
        paymentEndpoint: '/verify-payment',
        instructions: `Send ${PROMPT_COST} USDC to complete this prompt request.`,
      },
    });
  }

  // ─── Bounded Execution: Payment verified → Execute AI ─────────────
  const session = paymentService.getSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  try {
    // AI NEVER runs before payment — this is the bounded execution guarantee
    const aiResult = await aiService.executePrompt(session.prompt);

    // Clean up the session after successful execution
    paymentSessions.delete(sessionId);

    return res.status(200).json({
      success: true,
      prompt: session.prompt,
      ai: aiResult,
      payment: {
        cost: session.cost,
        currency: 'USDC',
        sessionId,
        status: 'completed',
      },
    });
  } catch (err) {
    console.error('AI execution error:', err);
    return res.status(500).json({
      error: 'AI Execution Failed',
      message: 'An error occurred during prompt processing.',
    });
  }
});

/**
 * POST /verify-payment
 * Simulates payment verification for a session.
 * In production, this would verify an on-chain USDC transaction.
 */
app.post('/verify-payment', (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: '"sessionId" is required.',
    });
  }

  const session = paymentService.getSession(sessionId);
  if (!session) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Payment session not found or expired.',
    });
  }

  const result = paymentService.verifyPayment(sessionId);

  if (!result.success) {
    return res.status(409).json({
      error: 'Payment Error',
      message: result.error,
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Payment verified successfully.',
    sessionId,
    cost: session.cost,
    currency: 'USDC',
  });
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'operational',
    service: 'Prompt402 Backend',
    version: '1.0.0',
    uptime: process.uptime(),
    promptCost: `${PROMPT_COST} USDC`,
  });
});

// ─── Start Server ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ┌─────────────────────────────────────────────┐`);
  console.log(`  │                                             │`);
  console.log(`  │   🚀 PROMPT402 BACKEND                     │`);
  console.log(`  │   Pay-As-You-Prompt AI with x402            │`);
  console.log(`  │                                             │`);
  console.log(`  │   Server:  http://localhost:${PORT}          │`);
  console.log(`  │   Cost:    ${PROMPT_COST} USDC per prompt            │`);
  console.log(`  │   Network: Base Sepolia (simulated)         │`);
  console.log(`  │                                             │`);
  console.log(`  └─────────────────────────────────────────────┘\n`);
});
