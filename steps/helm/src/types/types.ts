import Ajv from 'ajv';
import type { FromSchema } from 'json-schema-to-ts';
import { definitions } from './definition.js';

const ajv = new Ajv.default({
  allErrors: true
});

export const schema = ajv.compile<SchemaType>(definitions);

export type SchemaType = FromSchema<typeof definitions>;

// TODO: Move flags into expose (some of them). e.G. sticky session should be for every expose.
// TODO: Add option to enable and disable children / other elements from specific modules? (Currently not required but nice to have)

export type VariableType = Exclude<SchemaType['variable'], undefined>[Exclude<keyof SchemaType['variable'], undefined>];
export type ExposeType = Exclude<SchemaType['expose'], undefined>[Exclude<keyof SchemaType['expose'], undefined>];
export type ServiceType = Exclude<SchemaType['service'], undefined>[Exclude<keyof SchemaType['service'], undefined>];
