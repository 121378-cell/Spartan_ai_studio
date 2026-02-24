import { ZodError } from 'zod';
import { aiDecisionSchema } from '../../schemas/aiSchema';
import { registerSchema } from '../../schemas/authSchema';
import { trackCommitmentSchema } from '../../schemas/planSchema';

describe('Request schema validation', () => {
  test('rejects invalid email format in register schema', async () => {
    await expect(
      registerSchema.parseAsync({
        body: {
          name: 'Sergio',
          email: 'invalid-email',
          password: 'ValidPass123'
        }
      })
    ).rejects.toBeInstanceOf(ZodError);
  });

  test('coerces commitmentLevel from string to number', async () => {
    const result = await trackCommitmentSchema.parseAsync({
      body: {
        userId: 'user-1',
        routineId: 'routine-1',
        commitmentLevel: '8',
        notes: 'ready'
      }
    });

    expect(result.body.commitmentLevel).toBe(8);
  });

  test('coerces PuntajeSinergico from string to number', async () => {
    const result = await aiDecisionSchema.parseAsync({
      params: {
        userId: 'user-1'
      },
      body: {
        PartituraSemanal: { readiness: 'high' },
        Causa: 'test-cause',
        PuntajeSinergico: '42'
      }
    });

    expect(result.body.PuntajeSinergico).toBe(42);
  });
});
