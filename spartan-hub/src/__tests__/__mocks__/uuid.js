// Mock for uuid to avoid ESM issues in tests
module.exports = {
  v4: jest.fn(() => 'test-uuid-mock-for-testing')
};