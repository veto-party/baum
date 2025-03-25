import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import type { IWorkspace } from '@veto-party/baum__core';
import type { ConfigMapping, IConfigMapRenderer, IConfigMapRendererResult, IConfigMapStructure } from '../interface/IConfigMapRenderer.js';
import { to_structured_data } from '../yaml/to_structured_data.js';

export class ConfigMapRenderer implements IConfigMapRenderer {
  render<Key>(workspace: IWorkspace | undefined, key: Key | undefined, map: Map<string | undefined, Map<Key | undefined, IConfigMapStructure>>, binding: Map<string, string> | undefined, name: string): IConfigMapRendererResult | Promise<IConfigMapRendererResult> {
    const yaml = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: `${name}-vars`
      },
      data: Object.fromEntries(allItems.entries())
    };

    return {
      getResolvedWorkspaceVars: () => {
        return new Map(
          allItems.entries().map(([key, value]) => {
            return [
              key,
              (value.static === true
                ? {
                    type: 'variable',
                    store: undefined,
                    variable: value.default
                  }
                : {
                    type: 'variable',
                    key,
                    global: value.type === 'global',
                    store: value.type === 'global' ? 'global' : name
                  }) satisfies ConfigMapping
            ] as const;
          })
        );
      },
      write: async (root, resolver) => {
        const path = await resolver.getNameByWorkspace(workspace);
        const filepath = Path.join(...[root, 'helm', path, key !== workspace && typeof ['string', 'number'].includes(typeof key) ? String(key) : undefined, 'templates'].filter(<T>(value: T | undefined): value is T => Boolean(value)));

        await FileSystem.writeFile(Path.join(filepath, 'configmap.yaml'), to_structured_data(yaml).write());
      }
    };
  }
}
