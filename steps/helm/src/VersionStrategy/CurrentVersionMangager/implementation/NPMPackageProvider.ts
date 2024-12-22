import { CachedFN } from "@veto-party/baum__core";
import { ICurrentVersionManager } from "../ICurrentVersionManager.js";
import Axios, { AxiosInstance } from 'axios';
import npa from 'npm-package-arg';
import registryFetch from 'npm-registry-fetch';
import unzipper from 'unzipper';
import semver from "semver";
import ssri from "ssri";
import { Header, Pack, ReadEntry } from 'tar';

export class NPMPackageProvider implements ICurrentVersionManager {
      private newVersions: Record<string, string> = {};

      private axios: AxiosInstance;

      constructor(
          private registry: string,
        private packageName: string
      ) {
        this.axios = Axios.create({
            baseURL: registry,
            timeout: 5000
        });
      }

      @CachedFN(true)
      private async loadPackage() {
        const { data: givenPackage } = await this.axios.get(`${this.packageName}/latest`);

        if (!givenPackage.dist) {
            return {
                self_version: undefined,
                versions: {}
            };
        }

        const unzippers = await unzipper.Open.url(givenPackage.dist.tarball, {});

        const file = unzippers.files.find((file) => file.path.endsWith('versions.json'));

        if (!file) {
            throw new Error('Could not find versions.json in the package');
        }

        const versionsBuffer = await file.buffer();

        return {
            self_version: givenPackage.version,
            versions: JSON.parse(versionsBuffer.toString())
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

        const tarballStream = new Pack();

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

        const manifestHeader = new Header(Buffer.from(JSON.stringify(manifest)));
        manifestHeader.path = '/package.json';
        tarballStream.add(new ReadEntry(manifestHeader));

        const versionHeader = new Header(Buffer.from(JSON.stringify(newVersions)));
        versionHeader.path = '/versions.json';
        tarballStream.add(new ReadEntry(versionHeader));

        const metadata = {
            _id: manifest.name,
            name: manifest.name,
            'dist-tags': {} as Record<string, string>,
            versions: {} as Record<string, typeof manifest>,
            _attachments: {} as Record<string, any>
        }

        metadata.versions[manifest.version] = manifest;
        metadata["dist-tags"]['latest'] = manifest.version;
        metadata["dist-tags"][manifest.version] = manifest.version;

        const tarball = tarballStream.read();

        if (!tarball) {
          throw new Error('Something went wrong, please contact us! REASON (tarball was empty)');
        }

        const tarballName = `${manifest.name}-${manifest.version}.tgz`
        const tarballURI = `${manifest.name}/-/${tarballName}`
        const integrity = ssri.fromData(tarball, {
            algorithms: ['sha512', 'sha1'],
        })

        manifest._id = `${manifest.name}@${manifest.version}`;
        manifest.dist ??= {};
        manifest.dist.tarball = new URL(tarballURI, this.registry).href.replace(/^https:\/\//, 'http://');
        manifest.dist.integrity = integrity['sha512'][0].toString();
        manifest.dist.shasum = Buffer.from(integrity['sha1'][0].digest).toString('hex');

        metadata._attachments = {};
        metadata._attachments[tarballName] = {
          content_type: 'application/octet-stream',
          data: tarball.toString('base64'),
          length: tarball.length,
        };

        const spec = npa.resolve(manifest.name, manifest.version);

        if (!spec.escapedName) {
          throw new Error("Esaped name is missing?");
        }

        try {
          await registryFetch(spec.escapedName, {
            method: 'PUT',
            body: metadata,
            ignoreBody: true
          })
        } catch (error) {
          if ((error as any)?.code !== 'E409') {
            throw new Error('Could not put', {
              cause: error
            });
          }

          const current = await registryFetch.json(spec.escapedName, {
            query: { write: true }
          });

          const currentVersions = Object.keys(current.versions || {})
            .map(v => semver.clean(v, true))
            .concat(
              Object.keys(current.time || {})
                .map(v => semver.valid(v, true) && semver.clean(v, true))
                .filter(v => v)
            )

            if (currentVersions.indexOf(newVersion) !== -1) {
              const { name: pkgid, version } = current;
              throw new Error(
                  `Cannot publish ${pkgid}@${version} over existing version.`
              );
            }

            current.versions ??= {};;
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
                  break
          
                // copy
                default:
                  (current as any)[i] = metadata[i as keyof typeof metadata];
                  break;
              }
          }

          await registryFetch(spec.escapedName, {
            method: 'PUT',
            body: current,
            ignoreBody: true
          });
      }
    }
}