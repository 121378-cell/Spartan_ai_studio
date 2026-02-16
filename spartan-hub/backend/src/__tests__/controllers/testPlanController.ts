import { assignPlan, trackCommitment } from '../../controllers/planController';
import { logger } from '../../utils/logger';
import { createMockRequest, createMockResponse } from '../test-utils';

// Mock Express Request and Response objects
const mockRequest = (body?: Record<string, unknown>) => ({
  body: body || {},
});

const mockResponse = () => {
  const res = createMockResponse();
  res.status = jest.fn((code: number) => {
    res.statusCode = code;
    return res;
  }) as unknown as jest.Mock;
  res.json = jest.fn((data: unknown) => {
    res.data = data;
    return res;
  }) as unknown as jest.Mock;
  return res;
};

// Test the assignPlan function
async function testAssignPlan() {
  logger.debug('Testing assignPlan function', { context: 'test' });
  
  // Test with valid data
  const req = mockRequest({
    userId: 'user123',
    routineId: 'routine456',
    startDate: '2025-10-16'
  });

  const res = mockResponse();

  await assignPlan(req as any, res as any);

  logger.debug('Status called', { context: 'test', metadata: { statusCode: res.statusCode, data: res.data } });

  // Test with missing data
  const req2 = mockRequest({
    userId: 'user123'
    // Missing routineId and startDate
  });

  const res2 = mockResponse();

  await assignPlan(req2 as any, res2 as any);

  logger.debug('Status called (missing data)', { context: 'test', metadata: { statusCode: res2.statusCode, data: res2.data } });
}

// Test the trackCommitment function
async function testTrackCommitment() {
  logger.debug('Testing trackCommitment function', { context: 'test' });
  
  // Test with valid data
  const req = mockRequest({
    userId: 'user123',
    routineId: 'routine456',
    commitmentLevel: 8,
    notes: 'Feeling motivated'
  });

  const res = mockResponse();

  await trackCommitment(req as any, res as any);

  logger.debug('Status called', { context: 'test', metadata: { statusCode: res.statusCode, data: res.data } });

  // Test with invalid commitment level
  const req2 = mockRequest({
    userId: 'user123',
    routineId: 'routine456',
    commitmentLevel: 15 // Invalid level
  });

  const res2 = mockResponse();

  await trackCommitment(req2 as any, res2 as any);

  logger.debug('Status called (invalid level)', { context: 'test', metadata: { statusCode: res2.statusCode, data: res2.data } });
}

// Run tests
async function runTests() {
  await testAssignPlan();
  await testTrackCommitment();
}

runTests();