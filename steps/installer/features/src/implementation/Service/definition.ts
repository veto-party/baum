
import { asConst } from 'json-schema-to-ts';

export const pattern = '^[a-zA-Z0-9]+$';

export const mappingStructure = asConst({
    type: 'object',
    patternProperties: {
        [pattern]: {
            type: 'object'
        }
    }
});

export const definition = asConst({
    type: 'object',
    properties: {
        type: {
            type: 'string',
            enum: ['global', 'scoped']
        },
        definition: {
            type: 'object',
            properties: {
                origin: {
                    type: 'object',
                    properties: {
                        repository: {
                            type: 'string',
                            pattern: '^(?:(?:https?):\\/)?(?:www\\.)?[^/\r\n]+(?:/[^\r\n]*)?$'
                        },
                        version: {
                            type: 'string'
                        },
                        name: {
                            type: 'string'
                        }
                    },
                    required: ['repository', 'version', 'name'],
                    additionalProperties: false
                },
                from_reference: {
                    type: 'string'
                },
                from_directory: {
                    type: 'object',
                    properties: {
                        version: {
                            type: 'string'
                        },
                        path: {
                            type: 'string'
                        }
                    },
                    required: ['version', 'path'],
                    additionalProperties: false
                }
            },
            required: ['origin'],
            additionalProperties: false
        },
        origin_name_var: {
            type: 'string'
        }
    },
    required: ['type', 'definition', 'origin_name_var'],
    additionalProperties: false
});