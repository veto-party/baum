import { ConfigMapping, IConfigMapRenderer, IConfigMapRendererResult, IConfigMapStructure } from "../interface/IConfigMapRenderer.js";

export class ConfigMapRenderer implements IConfigMapRenderer {
    render<Key>(workspace: Key | undefined, map: Map<string | undefined, Map<Key | undefined, IConfigMapStructure>>, binding: Map<string, string> | undefined, name: string): IConfigMapRendererResult | Promise<IConfigMapRendererResult> {
        const allItems: IConfigMapStructure = new Map();

        const entriesToCheck = [Array.from(binding?.entries() ?? [])];
        const globalsToCheck = new Set<typeof entriesToCheck[number]>();

        do {
            const entries = entriesToCheck.pop()!;
            const possibleGlobalEntries: typeof entriesToCheck[number] = [];

            for (const entry of entries) {
                const [key, lookupKey] = entry;
                const item = map.get(undefined)?.get(workspace)?.get(lookupKey);

                if (!item) {
                    possibleGlobalEntries.push(entry);
                    globalsToCheck.add(possibleGlobalEntries);
                    continue;
                }

                allItems.set(key, item);

                if (item.binding) {
                    entriesToCheck.push(Object.entries(item.binding));
                }
            }
        } while (entriesToCheck.length > 0);

        do {
            const [entries] = globalsToCheck.values().take(1);
            globalsToCheck.delete(entries);

            for (const entry of entries) {
                const [key, lookupKey] = entry;
                const item = map.get(undefined)?.get(workspace)?.get(lookupKey);

                if (!item) {
                    throw new Error(`Entry(${key}, ${lookupKey} not found, checked scoped and global context.`);
                }

                allItems.set(key, {
                    ...item,
                    type: 'global'
                });

                if (item.binding) {
                    globalsToCheck.add(Object.entries(item.binding));
                }
            } 
        } while (globalsToCheck.size > 0);

        return {
            getResolvedWorkspaceVars: () => {
                return new Map(allItems.entries().map(([key, value]) => {
                    return [key, (value.static === true ? {
                        type: 'variable',
                        store: undefined,
                        variable: value.default
                    } : {
                        type: 'variable',
                        global: value.type === 'global',
                        store: value.type === 'global' ? 'global' : name
                    }) satisfies ConfigMapping] as const;
                }))
            },
            write: () => {
                throw new Error('NOT IMPLEMENTED!');
            }
        }
    }

}