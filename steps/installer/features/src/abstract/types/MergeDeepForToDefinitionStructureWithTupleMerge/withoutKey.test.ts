import { describe, expectTypeOf, test } from 'vitest';
import type { MergeDeepForToDefinitionStructureWithTupleMerge } from '../MergeDeepForToDefinitionStructureWithTupleMerge.js';

describe('Type merge test', () => {
  test('Merge 2 complex objects', () => {
    type ToTestA = {
      properties: {
        test: {
          type: 'string';
        };
      };
    };

    type ToTestB = {
      type: 'object';
      additionalProperties: false;
      oneOf: [
        {
          type: 'object';
          properties: {
            ehllo: {
              type: 'string';
              enum: ['world'];
            };
          };
          additionalProperties: false;
        },
        {
          type: 'object';
          properties: {
            ehllo: {
              type: 'string';
              enum: ['world2'];
            };
          };
          additionalProperties: false;
        }
      ];
    };

    type Expected = {
      type: 'object';
      properties: {
        test: {
          type: 'string';
        };
      };
      additionalProperties: false;
      oneOf: [
        {
          type: 'object';
          properties: {
            ehllo: {
              type: 'string';
              enum: ['world'];
            };
          };
          additionalProperties: false;
        },
        {
          type: 'object';
          properties: {
            ehllo: {
              type: 'string';
              enum: ['world2'];
            };
          };
          additionalProperties: false;
        }
      ];
    };
    expectTypeOf({} as MergeDeepForToDefinitionStructureWithTupleMerge<ToTestA, ToTestB>).toMatchObjectType<Expected>();
    expectTypeOf({} as MergeDeepForToDefinitionStructureWithTupleMerge<ToTestB, ToTestA>).toMatchObjectType<Expected>();
  });
});
