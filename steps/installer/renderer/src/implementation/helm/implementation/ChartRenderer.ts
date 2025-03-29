import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import type { IWorkspace } from '@veto-party/baum__core';
import type { ThirdPartyRendererStorage } from '../interface/I3rdPartyRenderer.js';
import type { IWritable } from '../interface/IWritable.js';
import { to_structured_data } from '../yaml/to_structured_data.js';
import { RawToken } from '../yaml/implementation/RawToken.js';

const pathToFileURL = (path: string) => {
    return new RawToken(`file://${path}`);
}

export class ChartRenderer {
  render(workspace: IWorkspace, externalDependencies: Map<string | number, ThirdPartyRendererStorage>): IWritable {
    return {
      write: async (root, resolver) => {
        const rootPath = await resolver.getNameByWorkspace(workspace);
        const filepath = Path.join(root, 'helm', rootPath);

        const yaml = {
          type: 'application',
          apiVersion: 'v2',
          // TODO: version provider.
          version: '0.0.0',
          dependencies: [
            Array.from(externalDependencies.entries()).map(([alias, entry]) => ({
              alias,
              // TODO: Path is possibly relative to given workspace.
              repository: entry.definition.from_reference ?? pathToFileURL(Path.relative(rootPath, entry.definition.from_directory!.path)),
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
          // TODO: version provider.
          version: '0.0.0',
          dependencies: [
            await Promise.all(
              workspaces.map(async (workspace) => {
                const path = await resolver.getNameByWorkspace(workspace);
                const filepath = Path.join(root, 'helm', path);
                return {
                  name: path,
                  alias: path,
                  repository: pathToFileURL(Path.relative(rootFilePath, filepath)),
                  // TODO: version provider.
                  version: '0.0.0'
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
