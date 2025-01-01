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

const variableAccessorPattern = '^[a-zA-Z0-9_\\.\\[\\]]*$';
const variableDefinitionPattern = '^[a-zA-Z0-9_]*$';
const definitionDefinionPattern = '^[a-z0-9_]*$';

const bindingDefinition = {
  type: 'object',
  patternProperties: {
    '.*': {
      type: 'string',
      pattern: variableAccessorPattern
    }
  },
  additionalProperties: false
} as const;

const generateVariableTypes = (type_required = true) =>
  ({
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
      default: defaultObjectTypes,
      generated: {
        type: 'number'
      },
      file: {
        type: 'string'
      },
      binding: bindingDefinition
    },
    required: type_required ? (['type'] as const) : [],
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
        required: ['static', 'secret', 'default', 'case', 'binding']
      }
    }
  }) as const;

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
    variable: {
      type: 'object',
      patternProperties: {
        [variableDefinitionPattern]: generateVariableTypes(true)
      },
      additionalProperties: false
    },
    binding: bindingDefinition,
    service: {
      type: 'object',
      patternProperties: {
        [definitionDefinionPattern]: {
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
            environment: {
              type: 'object',
              patternProperties: {
                '.*': generateVariableTypes(false)
              },
              additionalProperties: false
            },
            origin_name_var: {
              type: 'string'
            }
          },
          required: ['type', 'definition', 'origin_name_var'],
          additionalProperties: false
        }
      },
      additionalProperties: false
    },
    job: {
      type: 'object',
      patternProperties: {
        [definitionDefinionPattern]: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['global', 'scoped']
            },
            definition: {
              type: 'object',
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
            binding: bindingDefinition,
            variable: {
              type: 'object',
              patternProperties: {
                [variableDefinitionPattern]: generateVariableTypes(false)
              },
              additionalProperties: false
            }
          },
          required: ['type'],
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
          properties: {
            type: {
              type: 'string',
              enum: ['internal', 'load-balancer']
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
          },
          required: ['type'],
          additionalProperties: false,
          if: {
            properties: {
              type: {
                const: 'load-balancer'
              }
            }
          },
          then: {
            required: ['path', 'domainPrefix']
          },
          else: {
            not: {
              required: ['path', 'domainPrefix']
            }
          }
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
