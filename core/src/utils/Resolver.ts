import { isAbsolute, resolve } from 'node:path';
import uniqBy from 'lodash.uniqby';
import { CachedFN } from '../implementation/annotation/Cached.js';

export class Resolver {
  private constructor() {}

  public static readonly dependencyFields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies', 'bundledDependencies'];

  @CachedFN(false)
  public static ensureAbsolute(path: string, to?: string) {
    return isAbsolute(path) ? path : to ? resolve(to, path) : resolve(path);
  }

  @CachedFN(false, [false, true, true, true])
  public static resolve(directory: string, packageJson: Record<string, any>, overrides: Record<string, string>, ignores?: string[]) {
    const packageAndVersion: [string, string][] = [];

    const givenFields = ignores && ignores.length > 0 ? Resolver.dependencyFields.filter((el) => !ignores.includes(el)) : Resolver.dependencyFields;
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
