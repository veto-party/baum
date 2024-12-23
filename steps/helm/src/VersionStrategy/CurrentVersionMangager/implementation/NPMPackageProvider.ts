import { PassThrough, Readable } from 'node:stream';
import { buffer } from 'node:stream/consumers';
import { CachedFN, clearCacheForFN } from '@veto-party/baum__core';
import npa from 'npm-package-arg';
import registryFetch from 'npm-registry-fetch';
import semver from 'semver';
import ssri from 'ssri';
import tarstream from 'tar-stream';
import type { ICurrentVersionManager } from '../ICurrentVersionManager.js';

import normalizer from 'normalize-package-data';

export class NPMPackageProvider implements ICurrentVersionManager {
  private newVersions: Record<string, string> = {};

  constructor(
    private registry: string,
    private packageName: string
  ) {}

  @CachedFN(true)
  private async loadPackage() {
    const givenPackage = await registryFetch
      .json(`${this.packageName}/latest`, {
        registry: this.registry
      })
      .catch((error) => ({}) as Record<string, unknown>);

    if (typeof givenPackage.dist !== 'object' || !givenPackage.dist || !('tarball' in givenPackage.dist) || typeof givenPackage?.dist?.tarball !== 'string') {
      return {
        self_version: undefined,
        versions: {}
      };
    }

    const tarBuffer = await registryFetch(givenPackage.dist.tarball, {
      registry: this.registry
    }).then((response) => response.buffer());

    const file = await new Promise<Buffer>((resolve, reject) => {
      const read = tarstream.extract();
      read.on('entry', (header, stream, next) => {
        if (header.name === 'versions.json') {
          resolve(buffer(stream));
        }

        next();
      });

      read.on('finish', () => reject(new Error('File not found')));

      const readable = Readable.from(tarBuffer);
      readable.pipe(read);
    });

    // const file = unzippers.files.find((file) => file.path.endsWith('versions.json'));

    if (!file) {
      throw new Error('Could not find versions.json in the package');
    }

    return {
      self_version: typeof givenPackage.version === 'string' ? givenPackage.version : undefined,
      versions: JSON.parse(file.toString())
    };
  }

  async getCurrentVersionFor(name: string): Promise<string | undefined> {
    return (await this.loadPackage()).versions[name];
  }

  public async updateCurrentVersionFor(name: string, version: string): Promise<void> {
    this.newVersions[name] = version;
  }

  /**
   * https://github.com/npm/libnpmpublish/blob/main/publish.js#L60
   */
  public async flush() {
    const loaded = await this.loadPackage();
    const newVersions = { ...loaded.versions };

    for (const name in this.newVersions) {
      newVersions[name] = this.newVersions[name];
    }

    const newVersion = loaded.self_version ? semver.inc(loaded.self_version, 'patch') : '0.0.0';

    if (!newVersion) {
      throw new Error('Something went wrong, please contact us!');
    }

    const manifest: Record<string, any> = {
      name: this.packageName,
      version: newVersion
    };

    normalizer(manifest, console.warn, true);

    const packageJSONPassThrough = new PassThrough();
    packageJSONPassThrough.end(JSON.stringify(manifest));

    const newVersionsPassThrough = new PassThrough();
    newVersionsPassThrough.end(JSON.stringify(newVersions));

    const archive = tarstream.pack();
    const tarPromise = buffer(archive);

    archive.entry({ name: 'package.json' }, JSON.stringify(manifest));
    archive.entry({ name: 'versions.json' }, JSON.stringify(newVersions));

    archive.finalize();

    const tarball = await tarPromise;

    const metadata = {
      _id: manifest.name,
      name: manifest.name,
      'dist-tags': {} as Record<string, string>,
      versions: {} as Record<string, typeof manifest>,
      _attachments: {} as Record<string, any>
    };

    metadata.versions[manifest.version] = manifest;
    metadata['dist-tags'].latest = manifest.version;
    metadata['dist-tags'][manifest.version] = manifest.version;

    if (!tarball) {
      throw new Error('Something went wrong, please contact us! REASON (tarball was empty)');
    }

    const tarballName = `${manifest.name}-${manifest.version}.tgz`;
    const tarballURI = `${manifest.name}/-/${tarballName}`;
    const integrity = ssri.fromData(Buffer.from(tarball.toString()), {
      algorithms: ['sha512', 'sha1']
    });

    manifest._id = `${manifest.name}@${manifest.version}`;
    manifest.dist ??= {};
    manifest.dist.tarball = new URL(tarballURI, this.registry).href.replace(/^https:\/\//, 'http://');
    manifest.dist.integrity = integrity.sha512[0].toString();
    manifest.dist.shasum = (integrity.sha1[0] as any).hexDigest();

    metadata._attachments = {};
    metadata._attachments[tarballName] = {
      content_type: 'application/octet-stream',
      data: tarball.toString('base64'),
      length: tarball.length
    };

    const spec = npa.resolve(manifest.name, manifest.version);

    if (!spec.escapedName) {
      throw new Error('Esaped name is missing?');
    }

    try {
      await registryFetch(spec.escapedName, {
        method: 'PUT',
        body: metadata,
        ignoreBody: true,
        registry: this.registry
      });
    } catch (error) {
      if ((error as any)?.code !== 'E409') {
        throw new Error('Could not put', {
          cause: error
        });
      }

      const current = await registryFetch.json(spec.escapedName, {
        query: { write: true },
        registry: this.registry
      });

      const currentVersions = Object.keys(current.versions || {})
        .map((v) => semver.clean(v, true))
        .concat(
          Object.keys(current.time || {})
            .map((v) => semver.valid(v, true) && semver.clean(v, true))
            .filter((v) => v)
        );

      if (currentVersions.indexOf(newVersion) !== -1) {
        const { name: pkgid, version } = current;
        throw new Error(`Cannot publish ${pkgid}@${version} over existing version.`);
      }

      current.versions ??= {};
      (current as any).versions[newVersion] = metadata.versions[newVersion];

      for (const i in metadata) {
        switch (i) {
          // objects that copy over the new stuffs
          case 'dist-tags':
          case 'versions':
          case '_attachments':
            for (const j in metadata[i]) {
              current[i] = current[i] ?? {};
              (current as any)[i][j] = metadata[i][j];
            }
            break;

          // copy
          default:
            (current as any)[i] = metadata[i as keyof typeof metadata];
            break;
        }
      }

      await registryFetch(spec.escapedName, {
        method: 'PUT',
        body: current,
        ignoreBody: true,
        registry: this.registry
      });
    }

    this.newVersions = {};
    clearCacheForFN(this, 'loadPackage' as any);
  }
}
