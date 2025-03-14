
import { asConst } from "json-schema-to-ts"

export const volumeAccessPattern = '^[a-zA-Z0-9_]*$' as const;

export const definition = asConst({
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: false,
      properties: {
        pathInContainer: {
          type: 'string'
        },
        volume: {
          type: 'boolean'
        },
        readonly: {
          type: 'boolean',
        },
        metadata: {
          type: 'object'
        }
      }
    }
});
