import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { IWorkspace } from '@veto-party/baum__core';
import type { ThirdPartyRendererStorage } from '../interface/I3rdPartyRenderer.js';
import type { IWritable } from '../interface/IWritable.js';
import { to_structured_data } from '../yaml/to_structured_data.js';

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
            externalDependencies.entries().map(([alias, entry]) => ({
              alias,
              // TODO: Path is possibly relative to given workspace.
              repository: entry.definition.from_reference ?? pathToFileURL(Path.relative(rootPath, entry.definition.from_directory!.path)),
              name: entry.definition.origin.name!,
              version: entry.definition.origin.version
            }))
          ].flat()
        };

        await FileSystem.writeFile(Path.join(filepath, 'deployment.yaml'), to_structured_data(yaml).write());
      }
    };
  }

  renderGlobal(workspaces: IWorkspace[], externalDependencies: Map<string | number, ThirdPartyRendererStorage>): IWritable {
    return {
      write: async (root, resolver) => {
        const rootPath = await resolver.getNameByWorkspace(undefined);
        const filepath = Path.join(root, 'helm', rootPath);

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
                  repository: pathToFileURL(Path.relative(rootPath, filepath)),
                  // TODO: version provider.
                  version: '0.0.0'
                };
              })
            ),
            externalDependencies.entries().map(([alias, entry]) => ({
              alias,
              // TODO: Path is possibly relative to given workspace.
              repository: entry.definition.from_reference ?? pathToFileURL(Path.relative(rootPath, entry.definition.from_directory!.path)),
              name: entry.definition.origin.name!,
              version: entry.definition.origin.version
            }))
          ].flat()
        };

        await FileSystem.writeFile(Path.join(filepath, 'deployment.yaml'), to_structured_data(yaml).write());
      }
    };
  }
}
