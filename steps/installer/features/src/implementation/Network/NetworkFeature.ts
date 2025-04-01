import type { FromSchema } from 'json-schema-to-ts';
import { merge } from 'lodash-es';
import { AMergeFeature } from '../../abstract/AMergeFeature/AMergeFeature.js';
import type { IngestResult } from '../../interface/IFeature.js';
import { definition } from './definition.js';

export class NetworkFeature extends AMergeFeature<typeof definition, 'network', FromSchema<typeof definition>> {
  public constructor() {
    super(definition, 'network');
  }

  public mergeLayers(base: FromSchema<typeof definition> | undefined, parentLayers: IngestResult<FromSchema<typeof definition>>[]): FromSchema<typeof definition> {
    return merge({}, base, parentLayers);
  }
}
