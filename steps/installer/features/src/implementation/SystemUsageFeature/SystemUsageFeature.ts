import type { FromSchema } from 'json-schema-to-ts';
import { AFeature } from '../../abstract/AFeature.js';
import { definition } from './definition.js';

export class SystemUsageFeature extends AFeature<typeof definition, 'system_usage', FromSchema<typeof definition>> {
  constructor() {
    super(definition, 'system_usage');
  }
}
