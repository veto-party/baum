import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import type { IWorkspace } from '@veto-party/baum__core';
import { extractVariables } from '../../utility/extractVariables.js';
import type { IConfigMapStructure } from '../interface/IConfigMapRenderer.js';
import type { ISecretRenderer, ISecretRendererResult, SecretMapping } from '../interface/ISecretRenderer.js';
import { to_structured_data } from '../yaml/to_structured_data.js';

export class SecretRenderer implements ISecretRenderer {
  render(workspace: IWorkspace | undefined, map: Map<IWorkspace, IConfigMapStructure>, binding: Map<string, string> | undefined, name?: string): ISecretRendererResult | Promise<ISecretRendererResult> {
    const allItems = new Map(
      extractVariables(workspace, map, binding)
        .entries()
        .filter(([, value]) => value.secret === true)
    );

    const yaml = (name: string) => ({
      apiVersion: 'v1',
      kind: 'Secret',
      type: 'Opaque',
      metadata: {
        name: `${name}-secrets`
      },
      stringData: Object.fromEntries(allItems.entries())
    });

    return {
      getResolvedWorkspaceSecrets: () => {
        return new Map(
          allItems.entries().map(([key, value]) => {
            return [
              key,
              {
                type: 'secret',
                key,
                global: value.type === 'global',
                store: value.type === 'global' ? 'global' : undefined
              } satisfies SecretMapping
            ] as const;
          })
        );
      },
      write: async (root, resolver) => {
        const path = await resolver.getNameByWorkspace(workspace);
        const filepath = Path.join(...[root, 'helm', path, 'templates'].filter(<T>(value: T | undefined): value is T => Boolean(value)));

        await FileSystem.writeFile(Path.join(filepath, 'configmap.yaml'), to_structured_data(yaml(path)).write());
      }
    };
  }
}
