const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Post-Sales Management API',
      version: '1.0.0',
      description: `
        RESTful API for Post-Sales Management System with Kafka Event-Driven Architecture.
        
        This API provides three main services:
        - **Handover Readiness**: Manage handover process from KYC, Legal, and Payment teams
        - **Owner Onboarding**: Handle member registration and documentation
        - **Snagging & Defect**: Track defects and manage resolution workflow
        
        All services publish events to Kafka topics for integration with other systems.
      `,
      contact: {
        name: 'Post-Sales Team',
        email: 'postsales@example.com'
      },
      license: {
        name: 'ISC',
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'http://localhost:3001',
        description: 'Local backend bridge'
      }
    ],
    tags: [
      {
        name: 'Handover',
        description: 'Handover Readiness Service - Manage handover process'
      },
      {
        name: 'Onboarding',
        description: 'Owner Onboarding Service - Member registration and documentation'
      },
      {
        name: 'Defects',
        description: 'Snagging & Defect Service - Track and manage defects'
      }
    ],
    components: {
      schemas: {
        HandoverCase: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique case ID'
            },
            unit_id: {
              type: 'string',
              description: 'Unit identifier'
            },
            customer_id: {
              type: 'string',
              description: 'Customer identifier'
            },
            kyc_status: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected'],
              description: 'KYC verification status'
            },
            contract_status: {
              type: 'string',
              enum: ['pending', 'drafted', 'signed'],
              description: 'Legal contract status'
            },
            payment_status: {
              type: 'string',
              enum: ['pending', 'completed', 'failed'],
              description: 'Payment status'
            },
            overall_status: {
              type: 'string',
              enum: ['pending', 'ready', 'completed', 'blocked'],
              description: 'Overall handover status'
            },
            handover_date: {
              type: 'string',
              format: 'date',
              nullable: true
            },
            handover_by: {
              type: 'string',
              nullable: true
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        OnboardingCase: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            handover_case_id: {
              type: 'string',
              format: 'uuid',
              nullable: true
            },
            unit_id: {
              type: 'string'
            },
            customer_id: {
              type: 'string'
            },
            email: {
              type: 'string',
              format: 'email',
              nullable: true
            },
            phone: {
              type: 'string',
              nullable: true
            },
            registration_status: {
              type: 'string',
              enum: ['pending', 'completed', 'failed']
            },
            document_status: {
              type: 'string',
              enum: ['pending', 'uploaded', 'verified']
            },
            overall_status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed']
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        DefectCase: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            defect_number: {
              type: 'string',
              description: 'Auto-generated defect number (e.g., DEF-2026-0001)'
            },
            unit_id: {
              type: 'string'
            },
            title: {
              type: 'string'
            },
            description: {
              type: 'string',
              nullable: true
            },
            category: {
              type: 'string',
              enum: ['electrical', 'plumbing', 'cosmetic', 'structural', 'hvac', 'door_window', 'other']
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical']
            },
            status: {
              type: 'string',
              enum: ['reported', 'assigned', 'in_progress', 'resolved', 'verified', 'closed']
            },
            assigned_to: {
              type: 'string',
              nullable: true
            },
            reported_by: {
              type: 'string'
            },
            photo_before_url: {
              type: 'string',
              nullable: true
            },
            photo_after_url: {
              type: 'string',
              nullable: true
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
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
            error: {
              type: 'string',
              description: 'Error message'
            }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Invalid request parameters',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
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
              }
            }
          }
        }
      }
    }
  },
  apis: ['./routes/*.js'], // Path to route files with JSDoc comments
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
