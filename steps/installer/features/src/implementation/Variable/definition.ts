
import { asConst } from "json-schema-to-ts"

export const variableAccessorPattern = '^[a-zA-Z0-9_]*$' as const;

export const definition = asConst({
    type: 'object',
    patternProperties: {
      [variableAccessorPattern]: {
        type: 'object',
        properties: {
            type: {
                type: 'string',
                enum: ['global', 'scoped', 'scoped-name']
            },
            case: {
                type: 'string',
                enum: ['snake']
            },
            static: {
                type: 'boolean'
            },
            secret: {
                type: 'boolean'
            },
            default: {
                anyOf: [
                  {
                    type: 'boolean'
                  },
                  {
                    type: 'string'
                  },
                  {
                    type: 'number'
                  },
                  {
                    type: 'object'
                  }
                ]
              },
            generated: {
                type: 'number'
            },
            file: {
                type: 'string'
            }
        },
        required: ['type'],
        additionalProperties: false,
        if: {
            properties: {
                type: {
                    const: 'scoped-name'
                }
            }
        },
        then: {
            not: {
                required: ['static', 'secret', 'default', 'case']
            }
        }
      }
    },
    additionalProperties: false
});
