import { buffer } from 'node:stream/consumers';
import { URL } from 'node:url';
import zlib from 'node:zlib';
import normalizer from 'normalize-package-data';
import npa from 'npm-package-arg';
import registryFetch from 'npm-registry-fetch';
import semver from 'semver';
import ssri from 'ssri';
import tarstream from 'tar-stream';

export class NPMPackageWriter {
  constructor(
    private registry: string,
    private token?: string
  ) {}

  private partialRegistry(): string {
    const url = new URL(this.registry);
    const regKey = `//${url.host}${url.pathname}`;
    return `${regKey}:_authToken`;
  }

  protected getFetchParams(params?: Parameters<typeof registryFetch.json>[1]) {
    return {
      ...params,
      registry: this.registry,
      [this.partialRegistry()]: this.token
    };
  }

  /**
   * https://github.com/npm/libnpmpublish/blob/main/publish.js#L60
   */
  public async flushPackageWithMetadata(packageName: string, newVersion: string, files: Record<string, Buffer>) {
    if (!newVersion) {
      throw new Error('Something went wrong, please contact us!');
    }

    const manifest: Record<string, any> = {
      name: packageName,
      version: newVersion
    };

    normalizer(manifest, console.warn, true);

    const archive = tarstream.pack({
      emitClose: true
    });

    const tarPromise = buffer(archive.pipe(zlib.createGzip()));

    archive.entry({ name: 'package/package.json' }, Buffer.from(JSON.stringify(manifest)));

    for (const name in files) {
      archive.entry({ name }, files[name]);
    }

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
    const integrity = ssri.fromData(tarball, {
      algorithms: ['sha1', 'sha512']
    });

    manifest._id = `${manifest.name}@${manifest.version}`;
    manifest.dist ??= {};
    manifest.dist.tarball = new URL(tarballURI, this.registry);
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
      await registryFetch(
        spec.escapedName,
        this.getFetchParams({
          method: 'PUT',
          body: metadata,
          ignoreBody: true
        })
      );
    } catch (error) {
      if ((error as any)?.code !== 'E409' && (error as any)?.code !== 'E403') {
        console.error('Publish failed: ', error);
        throw new Error('Could not put', {
          cause: error
        });
      }

      const current = await registryFetch.json(
        spec.escapedName,
        this.getFetchParams({
          query: { write: true }
        })
      );

      const currentVersions = Object.keys(current.versions || {})
        .map((v) => semver.clean(v, true))
        .concat(
          Object.keys(current.time || {})
            .map((v) => semver.valid(v, true) && semver.clean(v, true))
            .filter((v) => v)
        );

      if (currentVersions.indexOf(newVersion) !== -1) {
        const { name: pkgid, version } = current;
        throw new Error(`Cannot publish ${pkgid}@${newVersion} over existing version(${version}).`);
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

      await registryFetch(
        spec.escapedName,
        this.getFetchParams({
          method: 'PUT',
          body: current,
          ignoreBody: true
        })
      );
    }
  }
}
