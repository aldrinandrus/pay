import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { estimateCost, calculateFinalCost } from './services/costCalculator';
import { verifySignature, getBalances, deductOnChainCost } from './services/blockchain';
import { streamPrompt } from './services/aiProvider';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// POST /api/estimate
app.post('/api/estimate', (req: Request, res: Response) => {
  const { model, prompt } = req.body;
  
  if (!model || !prompt) {
    return res.status(400).json({ error: "Missing model or prompt" });
  }

  const estimation = estimateCost(model, prompt, 500); // Defaulting maxTokens=500
  return res.json({
    estimated_cost: estimation.estimatedCost,
    max_cost: estimation.maxCost
  });
});

// POST /api/prompt
app.post('/api/prompt', async (req: Request, res: Response) => {
  const { wallet_address, model, prompt, max_tokens, stream } = req.body;
  const signature = req.headers.authorization?.split(" ")[1];

  if (!wallet_address || !model || !prompt || !signature) {
    return res.status(400).json({ error: "Missing required fields or signature" });
  }

  const nonceMessage = `Prompt402 Login Verification\nWallet: ${wallet_address}\nRequest to model: ${model}`;

  // 1. Verify Wallet Signature
  const isValid = await verifySignature(wallet_address, signature, nonceMessage);
  if (!isValid) {
    return res.status(400).json({ error: "Invalid signature" });
  }

  // 2. Check Balances on Blockchain & Database
  const { currentBalance } = await getBalances(wallet_address);
  const estimation = estimateCost(model, prompt, max_tokens || 500);

  if (parseFloat(currentBalance) < estimation.maxCost) {
    return res.status(402).json({
      error: "Payment Required",
      message: "Insufficient spending cap bounds for max_cost",
      balance: currentBalance,
      estimated_cost: estimation.estimatedCost,
      max_cost: estimation.maxCost,
    });
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // 3. Execute AI Stream & Post-Processing
  await streamPrompt(res, model, prompt, max_tokens, async (inTokens, outTokens, responseText) => {
    
    // 4. Cost Deduction
    const finalCost = calculateFinalCost(model, inTokens, outTokens);
    
    // Deduct on Blockchain
    const deduacted = await deductOnChainCost(wallet_address, finalCost);
    const finalStatus = deduacted ? "completed" : "failed";

    // Store in DB
    await prisma.transaction.create({
      data: {
        wallet_address,
        model,
        prompt,
        response: responseText,
        input_tokens: inTokens,
        output_tokens: outTokens,
        cost: finalCost,
        status: finalStatus
      }
    });
  });
});

// GET /api/balance/:wallet_address
app.get('/api/balance/:wallet_address', async (req: Request, res: Response) => {
  const wallet_address = req.params.wallet_address as string;

  const { spendingCap, currentBalance } = await getBalances(wallet_address);
  const txCount = await prisma.transaction.count({
    where: { wallet_address: wallet_address }
  });

  return res.json({
    spending_cap: spendingCap,
    current_balance: currentBalance,
    transaction_count: txCount
  });
});

// GET /api/history/:wallet_address
app.get('/api/history/:wallet_address', async (req: Request, res: Response) => {
  const wallet_address = req.params.wallet_address as string;

  const txs = await prisma.transaction.findMany({
    where: { wallet_address: wallet_address },
    orderBy: { created_at: 'desc' }
  });

  return res.json(txs);
});

app.listen(PORT, () => {
  console.log(`[Prompt402 API] Listening solidly on port ${PORT}`);
});
