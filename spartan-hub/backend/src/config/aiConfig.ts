export type AiProviderId = 'microservice' | 'groq' | 'openai' | 'anthropic' | 'google';

export interface ProviderConfig {
  id: AiProviderId;
  rateLimitPerMinute: number;
  timeoutMs: number;
  enabled: boolean;
}

export interface AiRuntimeConfig {
  mode: 'single' | 'multi';
  primary: AiProviderId;
  fallbacks: AiProviderId[];
  providers: Record<AiProviderId, ProviderConfig>;
}

function parseProviderId(value: string | undefined, defaultValue: AiProviderId): AiProviderId {
  const normalized = (value || '').toLowerCase();
  switch (normalized) {
  case 'groq':
    return 'groq';
  case 'openai':
    return 'openai';
  case 'anthropic':
    return 'anthropic';
  case 'google':
  case 'googleai':
  case 'gemini':
    return 'google';
  case 'microservice':
  case 'local':
  default:
    return defaultValue;
  }
}

function parseFallbacks(value: string | undefined): AiProviderId[] {
  if (!value) {
    return [];
  }

  const entries = value.split(',').map(entry => entry.trim()).filter(Boolean);
  const result: AiProviderId[] = [];

  for (const entry of entries) {
    const id = parseProviderId(entry, 'microservice');
    if (!result.includes(id)) {
      result.push(id);
    }
  }

  return result;
}

function buildProviderConfig(): Record<AiProviderId, ProviderConfig> {
  return {
    microservice: {
      id: 'microservice',
      rateLimitPerMinute: parseInt(process.env.AI_MICROSERVICE_RATE_LIMIT_PER_MINUTE || '120', 10),
      timeoutMs: parseInt(process.env.AI_MICROSERVICE_TIMEOUT_MS || '30000', 10),
      enabled: true
    },
    groq: {
      id: 'groq',
      rateLimitPerMinute: parseInt(process.env.AI_GROQ_RATE_LIMIT_PER_MINUTE || '60', 10),
      timeoutMs: parseInt(process.env.AI_GROQ_TIMEOUT_MS || '30000', 10),
      enabled: !!process.env.GROQ_API_KEY
    },
    openai: {
      id: 'openai',
      rateLimitPerMinute: parseInt(process.env.AI_OPENAI_RATE_LIMIT_PER_MINUTE || '60', 10),
      timeoutMs: parseInt(process.env.AI_OPENAI_TIMEOUT_MS || '30000', 10),
      enabled: !!process.env.OPENAI_API_KEY
    },
    anthropic: {
      id: 'anthropic',
      rateLimitPerMinute: parseInt(process.env.AI_ANTHROPIC_RATE_LIMIT_PER_MINUTE || '60', 10),
      timeoutMs: parseInt(process.env.AI_ANTHROPIC_TIMEOUT_MS || '30000', 10),
      enabled: !!process.env.ANTHROPIC_API_KEY
    },
    google: {
      id: 'google',
      rateLimitPerMinute: parseInt(process.env.AI_GOOGLE_RATE_LIMIT_PER_MINUTE || '60', 10),
      timeoutMs: parseInt(process.env.AI_GOOGLE_TIMEOUT_MS || '30000', 10),
      enabled: !!process.env.GEMINI_API_KEY
    }
  };
}

export function getAiConfig(): AiRuntimeConfig {
  const providers = buildProviderConfig();
  const rawMode = (process.env.AI_PROVIDER_MODE || process.env.AI_PROVIDER || 'microservice').toLowerCase();
  const mode: 'single' | 'multi' = rawMode === 'multi' ? 'multi' : 'single';

  const primary = parseProviderId(
    process.env.AI_PRIMARY_PROVIDER || process.env.AI_PROVIDER || 'microservice',
    'microservice'
  );

  const fallbacks = parseFallbacks(process.env.AI_FALLBACK_PROVIDERS);
  const normalizedFallbacks = fallbacks.filter(id => id !== primary);

  return {
    mode,
    primary,
    fallbacks: normalizedFallbacks,
    providers
  };
}

export function getProviderOrder(): AiProviderId[] {
  const config = getAiConfig();
  const order: AiProviderId[] = [];

  if (!order.includes(config.primary)) {
    order.push(config.primary);
  }

  for (const id of config.fallbacks) {
    if (!order.includes(id)) {
      order.push(id);
    }
  }

  if (!order.includes('microservice')) {
    order.push('microservice');
  }

  return order;
}

