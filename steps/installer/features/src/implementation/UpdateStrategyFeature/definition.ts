import { asConst } from 'json-schema-to-ts';

export const definition = asConst({
  type: 'object',
  required: ['type'],
  oneOf: [
    {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['RollingUpdate']
        },
        maxSurge: {
          type: 'string'
        },
        maxUnavailable: {
          type: 'string'
        }
      },
      additionalProperties: false
    },
    {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['Rereate']
        }
      },
      additionalProperties: false
    }
  ]
});
