import { asConst } from 'json-schema-to-ts';

export const variableDefinitionPattern = '^[a-zA-Z0-9_]*$';
export const definitionDefinitionPattern = '^[a-z0-9_]*$';


export const definition = asConst({
  // $schema: 'http://json-schema.org/draft-07/schema',
  type: 'array',
  items: {
    type: 'object',
    oneOf: [{
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['JOB']
        }
      }
    }, {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['SERVICE']
        },
        alias: {
          type: 'string'
        },
      }
    }]
  }
  // type: 'object',
  // properties: {
  //   $schema: {
  //     type: 'string'
  //   },
  //   is_service: {
  //     type: 'boolean'
  //   },
    // system_usage: {
    //   type: 'object',
    //   properties: {
    //     limit: {
    //       type: 'object',
    //       properties: {
    //         cpu: {
    //           type: 'string'
    //         },
    //         memory: {
    //           type: 'string'
    //         }
    //       },
    //       additionalProperties: false
    //     },
    //     requested: {
    //       type: 'object',
    //       properties: {
    //         cpu: {
    //           type: 'string'
    //         },
    //         memory: {
    //           type: 'string'
    //         }
    //       },
    //       additionalProperties: false
    //     }
    //   }
    // },
    
    // alias: {
    //   type: 'string'
    // },
    // service: {
    //   type: 'object',
    //   patternProperties: {
    //     [definitionDefinitionPattern]: {
    //     }
    //   },
    //   additionalProperties: false
    // },
    // job: {
    //   type: 'object',
    //   patternProperties: {
    //     [definitionDefinitionPattern]: {
    //       type: 'object',
    //       properties: {
    //         type: {
    //           type: 'string',
    //           enum: ['global', 'scoped']
    //         },
    //         definition: {
    //           type: 'object',
    //           oneOf: [
    //             {
    //               properties: {
    //                 on: {
    //                   type: 'string'
    //                 },
    //                 image: {
    //                   type: 'string'
    //                 }
    //               },
    //               additionalProperties: false
    //             },
    //             {
    //               properties: {
    //                 on: {
    //                   type: 'string'
    //                 },
    //                 project: {
    //                   type: 'string'
    //                 }
    //               },
    //               additionalProperties: false
    //             }
    //           ]
    //         },
    //         // binding: bindingDefinition,
            // variable: {
            //   type: 'object',
            //   patternProperties: {
            //     [variableDefinitionPattern]: generateVariableTypes(false)
            //   },
            //   additionalProperties: false
            // }
      //     },
      //     required: ['type', 'definition'],
      //     additionalProperties: false
      //   }
      // },
      // additionalProperties: false
    // },
    // expose: {
    // },
  //   flag: {
  //     type: 'object',
  //     properties: {
  //       'sticky-session': {
  //         type: 'boolean'
  //       }
  //     },
  //     additionalProperties: false
  //   }
  // },
  // if: {
  //   properties: {
  //     alias: {
  //       type: 'string'
  //     }
  //   },
  //   required: ['alias']
  // },
  // then: {
  //   properties: {
  //     is_service: {
  //       const: true
  //     }
  //   },
  //   required: ['is_service']
  // },
  // additionalProperties: false
});