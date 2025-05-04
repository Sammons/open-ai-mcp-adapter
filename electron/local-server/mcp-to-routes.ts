import { McpTool } from '../../src/types';
import { FastifyRequest, FastifyReply, RouteOptions } from 'fastify';

interface ToolRouteContext {
  tool: McpTool;
  serverName: string;
  invoke: (invocation: { inputs: any; stream?: boolean }) => Promise<any>;
}

// Helper function to normalize server name for URLs and IDs
function normalizeServerName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

export function createToolRoute(context: ToolRouteContext): RouteOptions {
  const { tool, serverName, invoke } = context;
  const normalizedName = normalizeServerName(serverName);

  return {
    method: 'POST',
    url: `/tools/${normalizedName}/${tool.name}`,
    schema: {
      body: {
        type: 'object',
        properties: {
          inputs: {
            type: 'object',
            additionalProperties: true
          },
          stream: {
            type: 'boolean',
            default: false
          }
        },
        required: ['inputs']
      }
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { inputs, stream = false } = request.body as { inputs: any; stream?: boolean };
        const result = await invoke({ inputs, stream });
        return result;
      } catch (error) {
        const err = error as Error;
        reply.status(500).send({
          error: err.message
        });
      }
    }
  };
}

function validateToolInputs(tool: McpTool, inputs: Record<string, any>): string[] {
  const errors: string[] = [];

  // Check required parameters
  for (const [paramName, param] of Object.entries(tool.parameters)) {
    if (param.required && !(paramName in inputs)) {
      errors.push(`Missing required parameter: ${paramName}`);
      continue;
    }

    const value = inputs[paramName];
    if (value !== undefined) {
      // Type validation
      switch (param.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push(`Parameter ${paramName} must be a string`);
          }
          break;
        case 'number':
          if (typeof value !== 'number') {
            errors.push(`Parameter ${paramName} must be a number`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`Parameter ${paramName} must be a boolean`);
          }
          break;
        case 'array':
          if (!Array.isArray(value)) {
            errors.push(`Parameter ${paramName} must be an array`);
          }
          break;
        case 'object':
          if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            errors.push(`Parameter ${paramName} must be an object`);
          }
          break;
      }
    }
  }

  return errors;
}

export function createOpenApiSchema(tools: McpTool[]) {
  return {
    openapi: '3.1.0',
    info: {
      title: 'MCP Tools API',
      description: 'REST API for MCP Tools',
      version: '1.0.0'
    },
    paths: tools.reduce((paths, tool) => {
      paths[`/tools/${tool.name}`] = {
        post: {
          summary: `Invoke ${tool.name}`,
          description: tool.description,
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    inputs: {
                      type: 'object',
                      properties: Object.entries(tool.parameters).reduce((props, [name, param]) => {
                        props[name] = {
                          type: param.type,
                          description: param.description
                        };
                        return props;
                      }, {} as Record<string, any>),
                      required: Object.entries(tool.parameters)
                        .filter(([, param]) => param.required)
                        .map(([name]) => name)
                    },
                    stream: {
                      type: 'boolean',
                      default: false
                    }
                  },
                  required: ['inputs']
                }
              }
            },
            required: true
          },
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      result: {
                        type: 'object',
                        additionalProperties: true
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Bad request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string'
                      }
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };
      return paths;
    }, {} as Record<string, any>)
  };
}