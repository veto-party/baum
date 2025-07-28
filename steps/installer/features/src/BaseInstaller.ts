import type { FromSchema } from 'json-schema-to-ts';
import { GroupFeature } from './abstract/GroupFeature/GroupFeature.js';
import { definition } from './definition.js';

export class BaseInstaller<T extends typeof definition = typeof definition> extends GroupFeature<T, undefined, FromSchema<T>> {
  public constructor(value: T = definition as T) {
    super(value, undefined);
  }

  protected do_construct(value: any) {
    return new BaseInstaller(value);
  }

  public static makeInstance(): BaseInstaller<typeof definition> {
    const installer = new BaseInstaller<typeof definition>(definition);

    return installer;
  }
}
