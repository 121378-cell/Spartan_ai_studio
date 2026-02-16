import swaggerJsdoc from 'swagger-jsdoc';
import { ROLES } from '../middleware/auth';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Spartan Hub API',
      version: '1.0.0',
      description: 'Comprehensive API documentation for Spartan Fitness Hub backend services',
      contact: {
        name: 'Spartan Fitness Team',
        email: 'support@spartanhub.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.spartanhub.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token obtained from login or registration'
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'access_token',
          description: 'JWT access token stored in httpOnly cookie'
        },
        refreshCookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'refresh_token',
          description: 'JWT refresh token stored in httpOnly cookie'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Unique user identifier',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            name: {
              type: 'string',
              description: 'User full name',
              example: 'John Doe'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com'
            },
            role: {
              type: 'string',
              enum: Object.values(ROLES),
              description: 'User role for authorization',
              example: ROLES.USER
            }
          }
        },
        Session: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Session identifier',
              example: 'sess_123456789'
            },
            userAgent: {
              type: 'string',
              description: 'Browser/client user agent',
              example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            },
            ipAddress: {
              type: 'string',
              description: 'Client IP address',
              example: '192.168.1.100'
            },
            lastActivityAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last activity timestamp',
              example: '2025-12-26T12:00:00Z'
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              description: 'Session expiration timestamp',
              example: '2025-12-27T12:00:00Z'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether session is active',
              example: true
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Error message',
              example: 'An error occurred'
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              description: 'Success message',
              example: 'Operation completed successfully'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required or token invalid/expired',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              examples: {
                noToken: {
                  summary: 'No token provided',
                  value: {
                    success: false,
                    message: 'Access denied. No token provided. Please log in to continue.'
                  }
                },
                invalidToken: {
                  summary: 'Invalid token',
                  value: {
                    success: false,
                    message: 'Invalid or expired token. Please log in again.'
                  }
                },
                expiredSession: {
                  summary: 'Session expired',
                  value: {
                    success: false,
                    message: 'Session expired. Please log in again.'
                  }
                }
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Access denied. You do not have permission to perform this action.'
              }
            }
          }
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Validation failed. Please check your input.'
              }
            }
          }
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'An internal server error occurred. Please try again later.'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and registration endpoints'
      },
      {
        name: 'Token Management',
        description: 'JWT token refresh, revocation, and management'
      },
      {
        name: 'User Management',
        description: 'User profile and role management'
      },
      {
        name: 'Health',
        description: 'Service health and status endpoints'
      },
      {
        name: 'Plan Management',
        description: 'Plan assignment and commitment tracking endpoints'
      },
      {
        name: 'Activity Management',
        description: 'User activity tracking and history endpoints'
      },
      {
        name: 'AI Services',
        description: 'AI-powered recommendations and decision endpoints'
      },
      {
        name: 'Fitness',
        description: 'Exercise and nutrition information endpoints'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
export default swaggerSpec;
