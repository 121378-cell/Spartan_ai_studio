import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AiProviderFactory } from '../../services/ai/AiProviderFactory';
import { GroqProvider } from '../../services/ai/providers/GroqProvider';
import { MicroserviceProvider } from '../../services/ai/providers/MicroserviceProvider';

describe('AiProviderFactory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    AiProviderFactory.resetProvider();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return MicroserviceProvider by default', () => {
    delete process.env.AI_PROVIDER;
    const provider = AiProviderFactory.getProvider();
    expect(provider).toBeInstanceOf(MicroserviceProvider);
    expect(provider.getProviderName()).toBe('MicroserviceProvider');
  });

  it('should return GroqProvider when configured', () => {
    process.env.AI_PROVIDER = 'groq';
    const provider = AiProviderFactory.getProvider();
    expect(provider).toBeInstanceOf(GroqProvider);
    expect(provider.getProviderName()).toBe('GroqProvider');
  });

  it('should return MicroserviceProvider when configured explicitly', () => {
    process.env.AI_PROVIDER = 'microservice';
    const provider = AiProviderFactory.getProvider();
    expect(provider).toBeInstanceOf(MicroserviceProvider);
  });

  it('should return MicroserviceProvider for unknown provider', () => {
    process.env.AI_PROVIDER = 'unknown';
    const provider = AiProviderFactory.getProvider();
    expect(provider).toBeInstanceOf(MicroserviceProvider);
  });

  it('should return singleton instance', () => {
    const provider1 = AiProviderFactory.getProvider();
    const provider2 = AiProviderFactory.getProvider();
    expect(provider1).toBe(provider2);
  });

  it('should create new instance after reset', () => {
    const provider1 = AiProviderFactory.getProvider();
    AiProviderFactory.resetProvider();
    const provider2 = AiProviderFactory.getProvider();
    expect(provider1).not.toBe(provider2);
  });
});
