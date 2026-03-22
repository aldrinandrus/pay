// Cost Calculation (Pricing per 1k tokens)
export const PRICING = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-3.5': { input: 0.0005, output: 0.0015 },
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'gemini-pro': { input: 0.001, output: 0.002 },
  'mistral': { input: 0.002, output: 0.006 },
};

export function estimateCost(model: string, promptText: string, maxTokens: number = 500) {
  const modelPricing = PRICING[model as keyof typeof PRICING] || PRICING['gpt-3.5'];
  
  // Rough estimate: 1 token ~= 4 chars
  const estimatedInputTokens = Math.ceil(promptText.length / 4);
  const estimatedOutputTokens = maxTokens;

  const estimatedCost = (estimatedInputTokens / 1000) * modelPricing.input + 
                        (estimatedOutputTokens / 1000) * modelPricing.output;

  return {
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedCost: parseFloat(estimatedCost.toFixed(6)),
    maxCost: parseFloat(((estimatedInputTokens / 1000) * modelPricing.input + (maxTokens / 1000) * modelPricing.output).toFixed(6))
  };
}

export function calculateFinalCost(model: string, inputTokens: number, outputTokens: number) {
  const modelPricing = PRICING[model as keyof typeof PRICING] || PRICING['gpt-3.5'];
  const cost = (inputTokens / 1000) * modelPricing.input + (outputTokens / 1000) * modelPricing.output;
  return parseFloat(cost.toFixed(6));
}
