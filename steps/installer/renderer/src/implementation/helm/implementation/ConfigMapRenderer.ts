import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import type { IWorkspace } from '@veto-party/baum__core';
import type { ConfigMapping, IConfigMapRenderer, IConfigMapRendererResult, IConfigMapStructure } from '../interface/IConfigMapRenderer.js';
import { to_structured_data } from '../yaml/to_structured_data.js';

export class ConfigMapRenderer implements IConfigMapRenderer {
  render<Key>(workspace: IWorkspace | undefined, key: Key | undefined, map: Map<string | undefined, Map<Key | undefined, IConfigMapStructure>>, binding: Map<string, string> | undefined, name: string): IConfigMapRendererResult | Promise<IConfigMapRendererResult> {
    const allItems: IConfigMapStructure = new Map();

    const entriesToCheck = [Array.from(binding?.entries() ?? [])];
    const globalsToCheck = new Set<(typeof entriesToCheck)[number]>();

    do {
      const entries = entriesToCheck.pop()!;
      const possibleGlobalEntries: (typeof entriesToCheck)[number] = [];

      for (const entry of entries) {
        const [_key, lookupKey] = entry;
        const item = map.get(undefined)?.get(key)?.get(lookupKey);

        if (!item) {
          possibleGlobalEntries.push(entry);
          globalsToCheck.add(possibleGlobalEntries);
          continue;
        }

        allItems.set(_key, item);

        if (item.binding) {
          entriesToCheck.push(Object.entries(item.binding));
        }
      }
    } while (entriesToCheck.length > 0);

    do {
      const [entries] = globalsToCheck.values().take(1);
      globalsToCheck.delete(entries);

      for (const entry of entries) {
        const [_key, lookupKey] = entry;
        const item = map.get(undefined)?.get(key)?.get(lookupKey);

        if (!item) {
          throw new Error(`Entry(${key}, ${lookupKey} not found, checked scoped and global context.`);
        }

        allItems.set(_key, {
          ...item,
          type: 'global'
        });

        if (item.binding) {
          globalsToCheck.add(Object.entries(item.binding));
        }
      }
    } while (globalsToCheck.size > 0);

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
