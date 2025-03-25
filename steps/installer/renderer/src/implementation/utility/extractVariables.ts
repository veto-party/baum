import { CachedFN, type IWorkspace } from "@veto-party/baum__core";
import { toPath } from 'lodash-es';
import type { IConfigMapStructure } from "../helm/interface/IConfigMapRenderer.js";

class VariableExtractor {

    private static toLookupKey(key: string) {
        const path = toPath(key);

        if (path.length < 1) {
            return key;
        }

        const [resolved, ...lookup] = path;

        return 
    }

    @CachedFN(false)
    extractVariables<Key>(workspace: IWorkspace|undefined, key: Key | undefined, map: Map<string | undefined, Map<Key | undefined, IConfigMapStructure>>, binding: Map<string, string> | undefined, name: string) {
        const allItems: IConfigMapStructure = new Map();

        const entriesToCheck = [Array.from(binding?.entries() ?? [])];
        const globalsToCheck = new Set<typeof entriesToCheck[number]>();

        do {
            const entries = entriesToCheck.pop()!;
            const possibleGlobalEntries: typeof entriesToCheck[number] = [];

            for (const entry of entries) {
                const [_key, lookupKey] = entry;

                const [resolvedLookup, realLookupKey] = 


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
                const item = map.get(undefined)?.get(undefined)?.get(lookupKey);

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
    }
}


const extractor = new VariableExtractor();
export const extractVariables = extractor.extractVariables.bind(extractor);