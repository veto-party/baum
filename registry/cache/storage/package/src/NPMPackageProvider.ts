import { buffer } from 'node:stream/consumers';
import { CachedFN, clearCacheForFN } from '@veto-party/baum__core';
import semver from 'semver';
import { NPMPackageGetter } from './access/NPMPackageGetter.js';
import { NPMPackageWriter } from './access/NPMPackageWriter.js';

export class NPMPackageProvider {
  protected newVersions: Record<string, string> = {};

  constructor(
    registry: string,
    private packageName: string,
    token?: string
  ) {
    this.writer = new NPMPackageWriter(registry, token);
    this.getter = new NPMPackageGetter(registry, token);
  }

  private getter: NPMPackageGetter;
  private writer: NPMPackageWriter;

  @CachedFN(true)
  private async ensureCurrentPackage() {
    const givenPackage = await this.getter.loadPackage(this.packageName);

    if (givenPackage === undefined) {
      return {
        self_version: undefined,
        versions: {}
      };
    }

    const version = givenPackage['dist-tags'].latest;

    const result = await this.getter.fetchAndExtract(this.packageName, version);

    if (!result) {
      throw new Error('Could not load package.');
    }

    const { read, start } = result;

    const file = await new Promise<Buffer>((resolve, reject) => {
      read.on('entry', (header, stream, next) => {
        if (header.name.endsWith('versions.json')) {
          resolve(buffer(stream));
        }

        next();
      });

      read.on('finish', () => reject(new Error('File not found')));
      start();
    });

    if (!file) {
      throw new Error('Could not find versions.json in the package');
    }

    return {
      self_version: version,
      versions: JSON.parse(file.toString())
    };
  }

  async getCurrentVersionFor(name: string): Promise<string | undefined> {
    return (await this.ensureCurrentPackage()).versions[name];
  }

  async getPackageVersionFor(name: string): Promise<string | undefined> {
    const realLatestPackage = await this.getter.loadPackage(name);

    const realLatestMetadata = realLatestPackage?.dist?.tarball ?? realLatestPackage?.versions?.[realLatestPackage?.['dist-tags']?.latest];
    const realLatest = realLatestMetadata?.version;

    return realLatest;
  }

  public async updateCurrentVersionFor(name: string, version: string): Promise<void> {
    this.newVersions[name] = version;
  }

  /**
   * https://github.com/npm/libnpmpublish/blob/main/publish.js#L60
   */
  public async flush() {
    const loaded = await this.ensureCurrentPackage();
    const newVersions = { ...loaded.versions };

    for (const name in this.newVersions) {
      newVersions[name] = this.newVersions[name];
    }

    const newVersion = loaded.self_version ? semver.inc(loaded.self_version, 'patch') : '0.0.0';

    if (!newVersion) {
      throw new Error('Something went wrong, please contact us!');
    }

    this.writer.flushPackageWithMetadata(this.packageName, newVersion, {
      'package/versions.json': Buffer.from(JSON.stringify(newVersions))
    });

    this.newVersions = {};
    clearCacheForFN(this, 'ensureCurrentPackage' as any);
    clearCacheForFN(this.getter, 'loadPackage');
  }
}
