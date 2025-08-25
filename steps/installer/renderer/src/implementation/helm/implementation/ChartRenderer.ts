import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import { allSettledButNoFailures, type IWorkspace } from '@veto-party/baum__core';
import type { IHelmVersionInfoProvider } from '../../../interface/IVersionProvider.js';
import type { ThirdPartyRendererStorage } from '../interface/factory/I3rdPartyRenderer.js';
import type { IWritable } from '../interface/IWritable.js';
import { RawToken } from '../yaml/implementation/RawToken.js';
import { to_structured_data } from '../yaml/to_structured_data.js';

const pathToFileURL = (path: string) => {
  return new RawToken(`file://${path}`);
};

export class ChartRenderer {
  public constructor(private versionProvider: IHelmVersionInfoProvider) {}

  render(workspace: IWorkspace, externalDependencies: Map<string | number, ThirdPartyRendererStorage>): IWritable {
    return {
      write: async (root, resolver) => {
        const rootPath = await resolver.getNameByWorkspace(workspace);
        const filepath = Path.join(root, 'helm', rootPath);

        const possiblyRelativePath = (path: string) => (Path.isAbsolute(path) ? path : Path.resolve(workspace.getDirectory(), path));

        const yaml = {
          type: 'application',
          apiVersion: 'v2',
          name: rootPath,
          version: this.versionProvider.getVersionForWorkspace(workspace),
          dependencies: [
            Array.from(externalDependencies.entries()).map(([alias, entry]) => ({
              alias,
              repository: entry.definition.from_reference ?? pathToFileURL(Path.relative(rootPath, possiblyRelativePath(entry.definition.from_directory!.path))),
              name: entry.definition.origin.name!,
              version: entry.definition.origin.version
            }))
          ].flat(3)
        };

        await FileSystem.mkdir(filepath, { recursive: true });
        await FileSystem.writeFile(Path.join(filepath, 'Chart.yaml'), to_structured_data(yaml).write());
      }
    };
  }

  renderGlobal(workspaces: IWorkspace[], externalDependencies: Map<string | number, ThirdPartyRendererStorage>): IWritable {
    return {
      write: async (root, resolver) => {
        const rootPath = await resolver.getNameByWorkspace(undefined);
        const rootFilePath = Path.join(root, 'helm', rootPath);

        const yaml = {
          type: 'application',
          apiVersion: 'v2',
          name: rootPath,
          version: await this.versionProvider.getProjectVersion(),
          dependencies: [
            await allSettledButNoFailures(
              workspaces.map(async (workspace) => {
                const path = await resolver.getNameByWorkspace(workspace);
                const filepath = Path.join(root, 'helm', path);
                return {
                  name: path,
                  alias: path,
                  repository: pathToFileURL(Path.relative(rootFilePath, filepath)),
                  // TODO: version provider.
                  version: this.versionProvider.getVersionForWorkspace(workspace)
                };
              })
            ),
            Array.from(externalDependencies.entries()).map(([alias, entry]) => ({
              alias,
              // TODO: Path is possibly relative to given workspace.
              repository: entry.definition.from_reference ?? pathToFileURL(Path.relative(rootPath, entry.definition.from_directory!.path)),
              name: entry.definition.origin.name!,
              version: entry.definition.origin.version
            }))
          ].flat(3)
        };

        await FileSystem.mkdir(rootFilePath, { recursive: true });
        await FileSystem.writeFile(Path.join(rootFilePath, 'Chart.yaml'), to_structured_data(yaml).write());
      }
    };
  }
}
