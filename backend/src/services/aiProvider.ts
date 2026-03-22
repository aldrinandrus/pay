import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Mistral } from '@mistralai/mistralai';
import { Response } from 'express';

// Clients will be instantiated lazily inside streamPrompt

export async function streamPrompt(
  res: Response, 
  model: string, 
  prompt: string, 
  maxTokens: number = 500, 
  onComplete: (inputTokens: number, outputTokens: number, fullResponse: string) => Promise<void>
) {
  let fullResponse = "";
  let inputTokens = Math.ceil(prompt.length / 4); // Fast fallback estimate
  let outputTokens = 0;

  try {
    if (model.includes('gpt')) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'fake-key' });
      const gptModel = model === 'gpt-4' ? 'gpt-4' : 'gpt-3.5-turbo';
      const stream = await openai.chat.completions.create({
        model: gptModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        fullResponse += text;
        outputTokens += 1;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    } else if (model.includes('claude')) {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'fake-key' });
      const claudeModel = model === 'claude-3-opus' ? 'claude-3-opus-20240229' : 'claude-3-5-sonnet-20240620';
      const stream = await anthropic.messages.stream({
        model: claudeModel,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });
      
      stream.on('text', (text) => {
        fullResponse += text;
        outputTokens += 1;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      });
      
      await new Promise<void>((resolve, reject) => {
        stream.on('end', () => resolve());
        stream.on('error', reject);
      });
    } else if (model.includes('gemini')) {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || 'AIza-fake-key-bypass');
      const aiModel = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await aiModel.generateContentStream(prompt);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        fullResponse += text;
        outputTokens += Math.ceil(text.length / 4);
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    } else {
      // Fallback/Mistral
      const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY || 'fake-key' });
      const stream = await mistral.chat.stream({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: prompt }],
        maxTokens,
      });

      for await (const chunk of stream) {
        const text = chunk.data.choices[0]?.delta?.content || "";
        fullResponse += text;
        outputTokens += 1;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
  } catch (error) {
    console.error("AI Provider error:", error);
    res.write(`data: ${JSON.stringify({ error: "AI API Failure" })}\n\n`);
  }

  // After stream completes, finalize output
  res.write(`data: [DONE]\n\n`);
  res.end();
  
  await onComplete(inputTokens, outputTokens, fullResponse);
}
