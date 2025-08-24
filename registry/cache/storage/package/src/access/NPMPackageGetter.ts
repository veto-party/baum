import { Readable } from 'node:stream';
import { URL } from 'node:url';
import zlib from 'node:zlib';
import { CachedFN, clearCacheForFN } from '@veto-party/baum__core';
import registryFetch from 'npm-registry-fetch';
import tarstream from 'tar-stream';

export class NPMPackageGetter {
  constructor(
    private registry: string,
    private token?: string
  ) {}

  private partialRegistry(): string {
    const url = new URL(this.registry);
    const regKey = `//${url.host}${url.pathname}`;
    return `${regKey}:_authToken`;
  }

  protected getFetchParams(params?: Parameters<typeof registryFetch>[1]) {
    return {
      ...params,
      registry: this.registry,
      [this.partialRegistry()]: this.token
    };
  }

  public async fetch(url: string, params?: Parameters<typeof registryFetch>) {
    return registryFetch(url, this.getFetchParams(params));
  }

  @CachedFN(true)
  public async loadPackage(packageName: string) {
    const givenPackage: any = await registryFetch.json(packageName, this.getFetchParams()).catch(() => 404);

    let tarball: any = givenPackage;

    if (givenPackage === 404) {
      tarball = await registryFetch.json(`${packageName}/latest`, this.getFetchParams()).catch(() => undefined);
    }

    if (tarball === undefined) {
      return undefined;
    }

    return tarball;
  }

  async getCurrentVersionFor(packageName: string): Promise<string | undefined> {
    await clearCacheForFN(this, 'loadPackage');
    const realLatestPackage = await this.loadPackage(packageName);
    const realLatestMetadata = realLatestPackage?.versions?.[realLatestPackage?.['dist-tags']?.latest];
    return realLatestMetadata;
  }

  public async fetchAndExtract(packageName: string, version: string) {
    const givenPackage = await this.loadPackage(packageName);

    if (givenPackage === undefined) {
      return undefined;
    }

    const tarball = givenPackage?.dist?.tarball ?? givenPackage.versions[version];

    if (!tarball) {
      return undefined;
    }

    const tarBuffer = await this.fetch(tarball.dist.tarball).then((response) => response.buffer());

    const read = tarstream.extract();

    const start = () => {
      const readable = Readable.from(tarBuffer).pipe(zlib.createGunzip());
      readable.pipe(read);
    };

    return {
      start,
      read
    };
  }
}
