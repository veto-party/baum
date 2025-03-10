import { asConst } from 'json-schema-to-ts';

const defaultObjectTypes = {
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
} as const;

export const variableDefinitionPattern = '^[a-zA-Z0-9_]*$';
export const definitionDefinitionPattern = '^[a-z0-9_]*$';


export const definitions = asConst({
  $schema: 'http://json-schema.org/draft-07/schema',
  type: 'object',
  properties: {
    $schema: {
      type: 'string'
    },
    is_service: {
      type: 'boolean'
    },
    update_strategy: {
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
    },
    system_usage: {
      type: 'object',
      properties: {
        limit: {
          type: 'object',
          properties: {
            cpu: {
              type: 'string'
            },
            memory: {
              type: 'string'
            }
          },
          additionalProperties: false
        },
        requested: {
          type: 'object',
          properties: {
            cpu: {
              type: 'string'
            },
            memory: {
              type: 'string'
            }
          },
          additionalProperties: false
        }
      }
    },
    scaling: {
      type: 'object',
      properties: {
        minPods: {
          type: 'number'
        },
        maxPods: {
          type: 'number'
        },
        configuration: {
          type: 'object',
          patternProperties: {
            '.*': {
              type: 'object',
              required: ['type', 'average'],
              properties: {
                type: {
                  type: 'string',
                  enum: ['AverageValue', 'Utilization']
                },
                average: {
                  type: 'string'
                }
              },
              additionalProperties: false
            }
          }
        }
      },
      additionalProperties: false
    },
    alias: {
      type: 'string'
    },
    service: {
      type: 'object',
      patternProperties: {
        [definitionDefinitionPattern]: {
        }
      },
      additionalProperties: false
    },
    job: {
      type: 'object',
      patternProperties: {
        [definitionDefinitionPattern]: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['global', 'scoped']
            },
            definition: {
              type: 'object',
              oneOf: [
                {
                  properties: {
                    on: {
                      type: 'string'
                    },
                    image: {
                      type: 'string'
                    }
                  },
                  additionalProperties: false
                },
                {
                  properties: {
                    on: {
                      type: 'string'
                    },
                    project: {
                      type: 'string'
                    }
                  },
                  additionalProperties: false
                }
              ]
            },
            // binding: bindingDefinition,
            // variable: {
            //   type: 'object',
            //   patternProperties: {
            //     [variableDefinitionPattern]: generateVariableTypes(false)
            //   },
            //   additionalProperties: false
            // }
          },
          required: ['type', 'definition'],
          additionalProperties: false
        }
      },
      additionalProperties: false
    },
    expose: {
      type: 'object',
      patternProperties: {
        '(0-9)+': {
          type: 'object',
          required: ['type'],
          oneOf: [
            {
              properties: {
                type: {
                  type: 'string',
                  enum: ['load-balancer']
                },
                cors: {
                  type: 'object',
                  required: [],
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
                    },
                    additionalProperties: false
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
    },
    connection: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          target: {
            type: 'string'
          }
        },
        required: ['target'],
        additionalProperties: false
      }
    },
    flag: {
      type: 'object',
      properties: {
        'sticky-session': {
          type: 'boolean'
        }
      },
      additionalProperties: false
    }
  },
  if: {
    properties: {
      alias: {
        type: 'string'
      }
    },
    required: ['alias']
  },
  then: {
    properties: {
      is_service: {
        const: true
      }
    },
    required: ['is_service']
  },
  additionalProperties: false
});