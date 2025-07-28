import { asConst } from 'json-schema-to-ts';

export const definition = asConst({
  type: 'object',
  properties: {
    defaults: {
      type: 'object',
      properties: {
        allow_outgoing: {
          type: 'string',
          enum: ['IN_NAMESPACE', 'NONE', 'ALL', 'STRICT']
        },
        allow_incoming: {
          type: 'string',
          enum: ['IN_NAMESPACE', 'NONE', 'ALL', 'STRICT']
        }
      }
    },
    allow_connections_to: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          to: {
            type: 'string'
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
          }
        },
        required: ['to'],
        additionalProperties: false
      }
    }
  }
});
