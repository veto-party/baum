import type { FromSchema } from 'json-schema-to-ts';
import type { IngestResult } from '../../interface/IFeature.js';
import type { FeatureContainer } from '../../interface/IFeatureContainer.js';
import { AFeature } from '../AFeature.js';

export abstract class AMergeFeature<
    T extends {}|Record<string, any> = {}, 
    Path extends string|undefined = undefined, 
    From = T extends {} ? any[]|any : FromSchema<T>
> extends AFeature<T, Path, From> {

    protected constructor(
        schema: T = {} as any,
        key: Path = undefined as Path
    ) {
        super(schema, key);
    }

    protected abstract mergeLayers(base: From|undefined, layers: IngestResult<From>[]): From;
    
    public async ingestObject(objects: Record<string, FeatureContainer>): Promise<IngestResult<From>[]> {
        await this.verfiyBaseSchema();

        let checkedKeys = new Set<string>();

        let entries = Object.entries(objects);
        const extractByFilter = (filter: (obj: [string, FeatureContainer]) => boolean) => {
            let removed = 0;
            const extractedEntries: [string, FeatureContainer][] = [];  
            [...entries].forEach((el, index) => {
                if (!filter(el)) {
                    return;
                }

                const [extracted] = entries.splice(index - removed, 1);
                removed++;
                extractedEntries.push(extracted);
            });

            return extractedEntries;
        }

        let currentLayer: [string, FeatureContainer][] = extractByFilter(([, obj]) => obj.children.length === 0);

        let current: From|undefined = undefined;

        do {
            const newKeys = new Set(currentLayer.map(([, obj]) => obj.children).flat());

            // TODO: Improve these two lines using sets.
            currentLayer = extractByFilter(([key]) => newKeys.has(key));
            const extractedLayers = await super.ingestObject(Object.fromEntries(currentLayer));

            current = await this.mergeLayers(current, extractedLayers);

            checkedKeys = checkedKeys.union(new Set(currentLayer.map(([key]) => key)));
        } while(currentLayer.length > 0);

        if (checkedKeys.intersection(new Set(Object.keys(entries))).size !== checkedKeys.size) {
            throw new Error('Invalid tree structure');
        }

        if (current === undefined) {
            throw new Error('Could not resolve object.');
        }

        return [{
            item: current
        }];
    }
}