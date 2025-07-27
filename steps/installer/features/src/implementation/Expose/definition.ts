import { asConst } from 'json-schema-to-ts';

export const definition = asConst({
  type: 'object',
  patternProperties: {
    '$(0-9)+^': {
      type: 'object',
      properties: {
        type: {
          type: 'string'
        }
      },
      required: ['type'],
      oneOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['type'],
          properties: {
            type: {
              type: 'string',
              enum: ['load-balancer']
            },
            cors: {
              type: 'object',
              additionalProperties: false,
              properties: {
                self: {
                  type: 'boolean'
                },
                methods: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                },
                headers: {
                  type: 'object',
                  properties: {
                    outgoing: {
                      type: 'array',
                      items: {
                        type: 'string'
                      }
                    },
                    incomming: {
                      type: 'array',
                      items: {
                        type: 'string'
                      }
                    }
                  }
                },
                maxAge: {
                  type: "number"
                },
                origins: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      domain: {
                        type: 'string'
                      },
                      domainIsAbsolute: {
                        type: 'string'
                      }
                    },
                    required: ['domain'],
                    additionalProperties: false
                  }
                }
              }
            },
            appendPath: {
              type: 'string'
            },
            doNotStripPrefix: {
              type: 'boolean'
            },
            passHostHeader: {
              type: 'boolean'
            },
            sticky: {
              type: 'object',
              required: ["fieldName"],
              properties: {
                fieldName: {
                  type: 'string'
                },
                lifetime: {
                  type: 'string'
                }
              }
            },
            matcher: {
              type: 'object',
              properties: {
                domain: {
                  type: 'string'
                },
                domainIsAbsolute: {
                  type: 'boolean'
                },
                path: {
                  type: 'string'
                }
              },
              additionalProperties: false
            }
          }
        },
        {
          type: 'object',
          required: ['type'],
          additionalProperties: false,
          properties: {
            type: {
              type: 'string',
              enum: ['internal']
            }
          }
        }
      ]
    }
  }
});
