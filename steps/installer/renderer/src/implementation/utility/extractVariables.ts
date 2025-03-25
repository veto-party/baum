import { CachedFN, type IWorkspace } from '@veto-party/baum__core';
import type { IConfigMapStructure } from '../helm/interface/IConfigMapRenderer.js';

class VariableExtractor {
  @CachedFN(false)
  extractVariables(workspace: IWorkspace | undefined, map: Map<IWorkspace | undefined, IConfigMapStructure>, binding: Map<string, string> | undefined) {
    const allItems: IConfigMapStructure = new Map();

    const entriesToCheck = [Array.from(binding?.entries() ?? [])];
    const globalsToCheck = new Set<(typeof entriesToCheck)[number]>();

    do {
      const entries = entriesToCheck.pop()!;
      const possibleGlobalEntries: (typeof entriesToCheck)[number] = [];

      for (const entry of entries) {
        const [_key, lookupKey] = entry;

        const item = map.get(workspace)?.get(lookupKey);

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
        const item = map?.get(undefined)?.get(lookupKey);

        if (!item) {
          throw new Error(`Entry(global, ${lookupKey} not found, checked scoped and global context.`);
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

    return allItems;
  }
}

const extractor = new VariableExtractor();
export const extractVariables = extractor.extractVariables.bind(extractor);
