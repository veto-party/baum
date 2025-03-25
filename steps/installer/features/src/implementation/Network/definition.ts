import { asConst } from 'json-schema-to-ts';

export const definition = asConst({
  type: 'array',
  items: {
    type: 'object',
    properties: {
      to: {
        type: 'string'
      },
      retries: {
        type: 'number'
      },
      policy: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['SIMPLE', 'ROUND_ROBIN']
          }
        },
        additionalProperties: false
      },
      protocol: {
        type: 'string',
        enum: ['http', 'https']
      },
      routes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            path: {
              type: 'string'
            }
          },
          required: ['path']
        },
        additionalProperties: false
      }
    },
    required: ['to', 'routes'],
    additionalProperties: false
  }
});
