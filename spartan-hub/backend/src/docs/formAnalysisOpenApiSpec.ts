/**
 * Form Analysis API Documentation
 * Phase A: Video Form Analysis MVP
 * 
 * OpenAPI 3.0 Specification
 */

export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Spartan Hub - Form Analysis API',
    version: '1.0.0',
    description: 'Video Form Analysis API for exercise technique evaluation'
  },
  servers: [
    { url: 'http://localhost:3001/api', description: 'Development' },
    { url: 'https://api.spartanhub.io/api', description: 'Production' }
  ],
  paths: {
    '/form-analysis': {
      post: {
        tags: ['Form Analysis'],
        summary: 'Save form analysis',
        security: [{ bearerAuth: [] }] as any,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId', 'exerciseType', 'formScore'],
                properties: {
                  userId: { type: 'string' },
                  exerciseType: { type: 'string', enum: ['squat', 'deadlift'] },
                  formScore: { type: 'integer', minimum: 0, maximum: 100 },
                  metrics: { type: 'object' },
                  warnings: { type: 'array', items: { type: 'string' } },
                  recommendations: { type: 'array', items: { type: 'string' } }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Created' },
          '400': { description: 'Bad request' }
        }
      },
      get: {
        tags: ['Form Analysis'],
        summary: 'Search form analyses',
        security: [{ bearerAuth: [] }] as any,
        parameters: [
          { name: 'userId', in: 'query', schema: { type: 'string' } },
          { name: 'exerciseType', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }
        ],
        responses: {
          '200': { description: 'Success' }
        }
      }
    },
    '/form-analysis/{id}': {
      get: {
        tags: ['Form Analysis'],
        summary: 'Get by ID',
        security: [{ bearerAuth: [] }] as any,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Success' },
          '404': { description: 'Not found' }
        }
      },
      delete: {
        tags: ['Form Analysis'],
        summary: 'Delete',
        security: [{ bearerAuth: [] }] as any,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deleted' } }
      }
    },
    '/form-analysis/user/{userId}': {
      get: {
        tags: ['Form Analysis'],
        summary: 'Get user analyses',
        security: [{ bearerAuth: [] }] as any,
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Success' } }
      }
    },
    '/form-analysis/user/{userId}/stats': {
      get: {
        tags: ['Form Analysis'],
        summary: 'Get user stats',
        security: [{ bearerAuth: [] }] as any,
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Success' } }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    }
  }
};

export default openApiSpec;
