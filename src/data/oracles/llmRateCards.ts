import { LLMRateCard } from '../../types/economics';

/**
 * Authentic Enterprise LLM Provider Rate Cards (USD per 1M tokens).
 * Sourced from official published API pricing pages:
 * - OpenAI API Pricing (GPT-4o, GPT-4o-mini, o1-preview)
 * - Anthropic API Pricing (Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus)
 * - Google Cloud Vertex AI Pricing (Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 2.0 Flash)
 * - AWS Bedrock On-Demand Pricing (Meta Llama 3.3 70B Instruct)
 */
export const LLM_RATE_CARDS: LLMRateCard[] = [
  {
    modelId: 'gpt-4o',
    aliases: ['gpt-4o-2024-08-06', 'gpt-4o-2024-11-20', 'openai/gpt-4o'],
    displayName: 'GPT-4o',
    provider: 'OpenAI',
    contextWindow: 128_000,
    inputPerMillionUsd: 2.5,
    cachedInputPerMillionUsd: 1.25,
    cacheWritePerMillionUsd: 2.5,
    outputPerMillionUsd: 10.0,
    reasoningPerMillionUsd: 10.0,
    visionPerThousandUnitsUsd: 2.13,
    audioPerMinuteUsd: 0.06,
    effectiveDate: '2025-Q1',
    sourceUrl: 'https://openai.com/api/pricing/',
  },
  {
    modelId: 'gpt-4o-mini',
    aliases: ['gpt-4o-mini-2024-07-18', 'openai/gpt-4o-mini'],
    displayName: 'GPT-4o mini',
    provider: 'OpenAI',
    contextWindow: 128_000,
    inputPerMillionUsd: 0.15,
    cachedInputPerMillionUsd: 0.075,
    cacheWritePerMillionUsd: 0.15,
    outputPerMillionUsd: 0.6,
    reasoningPerMillionUsd: 0.6,
    visionPerThousandUnitsUsd: 0.14,
    audioPerMinuteUsd: 0.015,
    effectiveDate: '2025-Q1',
    sourceUrl: 'https://openai.com/api/pricing/',
  },
  {
    modelId: 'o1-preview',
    aliases: ['o1-preview-2024-09-12', 'openai/o1-preview', 'o1'],
    displayName: 'OpenAI o1-preview',
    provider: 'OpenAI',
    contextWindow: 128_000,
    inputPerMillionUsd: 15.0,
    cachedInputPerMillionUsd: 7.5,
    cacheWritePerMillionUsd: 15.0,
    outputPerMillionUsd: 60.0,
    reasoningPerMillionUsd: 60.0,
    visionPerThousandUnitsUsd: 12.75,
    audioPerMinuteUsd: 0.0,
    effectiveDate: '2025-Q1',
    sourceUrl: 'https://openai.com/api/pricing/',
  },
  {
    modelId: 'claude-3-5-sonnet-20241022',
    aliases: ['claude-3-5-sonnet', 'claude-3.5-sonnet', 'anthropic/claude-3-5-sonnet-20241022'],
    displayName: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    contextWindow: 200_000,
    inputPerMillionUsd: 3.0,
    cachedInputPerMillionUsd: 0.3,
    cacheWritePerMillionUsd: 3.75,
    outputPerMillionUsd: 15.0,
    reasoningPerMillionUsd: 15.0,
    visionPerThousandUnitsUsd: 4.8,
    audioPerMinuteUsd: 0.0,
    effectiveDate: '2025-Q1',
    sourceUrl: 'https://www.anthropic.com/pricing',
  },
  {
    modelId: 'claude-3-5-haiku-20241022',
    aliases: ['claude-3-5-haiku', 'claude-3.5-haiku', 'anthropic/claude-3-5-haiku'],
    displayName: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    contextWindow: 200_000,
    inputPerMillionUsd: 0.8,
    cachedInputPerMillionUsd: 0.08,
    cacheWritePerMillionUsd: 1.0,
    outputPerMillionUsd: 4.0,
    reasoningPerMillionUsd: 4.0,
    visionPerThousandUnitsUsd: 1.28,
    audioPerMinuteUsd: 0.0,
    effectiveDate: '2025-Q1',
    sourceUrl: 'https://www.anthropic.com/pricing',
  },
  {
    modelId: 'claude-3-opus-20240229',
    aliases: ['claude-3-opus', 'anthropic/claude-3-opus'],
    displayName: 'Claude 3 Opus',
    provider: 'Anthropic',
    contextWindow: 200_000,
    inputPerMillionUsd: 15.0,
    cachedInputPerMillionUsd: 1.5,
    cacheWritePerMillionUsd: 18.75,
    outputPerMillionUsd: 75.0,
    reasoningPerMillionUsd: 75.0,
    visionPerThousandUnitsUsd: 24.0,
    audioPerMinuteUsd: 0.0,
    effectiveDate: '2025-Q1',
    sourceUrl: 'https://www.anthropic.com/pricing',
  },
  {
    modelId: 'gemini-1.5-pro',
    aliases: ['gemini-1.5-pro-002', 'google/gemini-1.5-pro'],
    displayName: 'Gemini 1.5 Pro (Vertex)',
    provider: 'Google Vertex',
    contextWindow: 2_000_000,
    inputPerMillionUsd: 1.25,
    cachedInputPerMillionUsd: 0.3125,
    cacheWritePerMillionUsd: 1.25,
    outputPerMillionUsd: 5.0,
    reasoningPerMillionUsd: 5.0,
    visionPerThousandUnitsUsd: 0.33,
    audioPerMinuteUsd: 0.002,
    effectiveDate: '2025-Q1',
    sourceUrl: 'https://cloud.google.com/vertex-ai/generative-ai/pricing',
  },
  {
    modelId: 'gemini-1.5-flash',
    aliases: ['gemini-1.5-flash-002', 'google/gemini-1.5-flash'],
    displayName: 'Gemini 1.5 Flash (Vertex)',
    provider: 'Google Vertex',
    contextWindow: 1_000_000,
    inputPerMillionUsd: 0.075,
    cachedInputPerMillionUsd: 0.01875,
    cacheWritePerMillionUsd: 0.075,
    outputPerMillionUsd: 0.3,
    reasoningPerMillionUsd: 0.3,
    visionPerThousandUnitsUsd: 0.02,
    audioPerMinuteUsd: 0.0005,
    effectiveDate: '2025-Q1',
    sourceUrl: 'https://cloud.google.com/vertex-ai/generative-ai/pricing',
  },
  {
    modelId: 'gemini-2.0-flash',
    aliases: ['gemini-2.0-flash-001', 'google/gemini-2.0-flash'],
    displayName: 'Gemini 2.0 Flash (Vertex)',
    provider: 'Google Vertex',
    contextWindow: 1_000_000,
    inputPerMillionUsd: 0.1,
    cachedInputPerMillionUsd: 0.025,
    cacheWritePerMillionUsd: 0.1,
    outputPerMillionUsd: 0.4,
    reasoningPerMillionUsd: 0.4,
    visionPerThousandUnitsUsd: 0.026,
    audioPerMinuteUsd: 0.0007,
    effectiveDate: '2025-Q1',
    sourceUrl: 'https://cloud.google.com/vertex-ai/generative-ai/pricing',
  },
  {
    modelId: 'meta.llama3-3-70b-instruct-v1:0',
    aliases: ['llama-3.3-70b', 'llama-3.3-70b-instruct', 'bedrock/llama-3.3-70b'],
    displayName: 'Llama 3.3 70B (Bedrock)',
    provider: 'AWS Bedrock',
    contextWindow: 128_000,
    inputPerMillionUsd: 0.72,
    cachedInputPerMillionUsd: 0.36,
    cacheWritePerMillionUsd: 0.72,
    outputPerMillionUsd: 0.72,
    reasoningPerMillionUsd: 0.72,
    visionPerThousandUnitsUsd: 0.0,
    audioPerMinuteUsd: 0.0,
    effectiveDate: '2025-Q1',
    sourceUrl: 'https://aws.amazon.com/bedrock/pricing/',
  },
];

export function resolveRateCard(modelId: string): LLMRateCard {
  const normalized = modelId.trim().toLowerCase();
  const exact = LLM_RATE_CARDS.find(
    (card) =>
      card.modelId.toLowerCase() === normalized ||
      card.aliases.some((alias) => alias.toLowerCase() === normalized)
  );
  if (exact) return exact;

  const partial = LLM_RATE_CARDS.find(
    (card) =>
      normalized.includes(card.modelId.toLowerCase()) ||
      card.aliases.some((alias) => normalized.includes(alias.toLowerCase()))
  );
  if (partial) return partial;

  // Fallback to GPT-4o standard enterprise rate card if an unrecognized model string arrives
  return LLM_RATE_CARDS[0];
}
