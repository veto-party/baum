import { isAbsolute, resolve } from 'node:path';
import uniqBy from 'lodash.uniqby';
import { CachedFN } from '../implementation/annotation/Cached.js';

export const dependencyFields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies', 'bundledDependencies'];

export class Resolver {
  private constructor() {}

  @CachedFN(false)
  public static ensureAbsolute(path: string) {
    return isAbsolute(path) ? path : resolve(path);
  }

  @CachedFN(false, [false, true, true, true])
  public static resolve(directory: string, packageJson: Record<string, any>, overrides: Record<string, string>, ignores?: string[]) {
    const packageAndVersion: [string, string][] = [];

    const givenFields = ignores && ignores.length > 0 ? dependencyFields.filter((el) => !ignores.includes(el)) : dependencyFields;
    for (const field of givenFields) {
      if (!packageJson?.[field]) continue;

      for (const [dep, version] of Object.entries(packageJson[field])) {
        if (overrides[dep]) {
          packageAndVersion.push([dep, overrides[dep]]);
          continue;
        }

        if (typeof version !== 'string') {
          console.warn(`Package ${dep}(in directory ${directory}) has invald version type: ${typeof version}, skipping...`);
          continue;
        }

        packageAndVersion.push([dep, version]);
      }
    }

    return uniqBy(packageAndVersion, ([name, version]) => `${name}@${version}`);
  }
}
