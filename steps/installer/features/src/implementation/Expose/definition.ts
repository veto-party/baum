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
