import { asConst, JSONSchema } from "json-schema-to-ts";

export const definition = asConst({
    type: 'object',
    // additionalProperties: true,
    patternProperties: {
        '$(0-9)+^': {
            type: 'object',
            properties: {
                type: {
                    type: 'string'
                }
            },
            required: ['type'], 
            // additionalProperties: false,
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
                                            relative: {
                                                type: 'boolean'
                                            },
                                            source: {
                                                type: 'string'
                                            }
                                        },
                                        required: ['source'],
                                        additionalProperties: false
                                    }
                                }
                            }
                        },
                        path: {
                            type: 'string'
                        },
                        doNotStripPrefix: {
                            type: 'boolean'
                        },
                        prefix: {
                            type: 'string'
                        },
                        domainPrefix: {
                            type: 'string'
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
                        },
                        path: {
                            type: 'string'
                        },
                        doNotStripPrefix: {
                            type: 'boolean'
                        },
                        domainPrefix: {
                            type: 'string'
                        }
                    }
                }
            ]
        }
    }
});