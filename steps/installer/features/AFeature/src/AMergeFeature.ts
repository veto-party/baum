import AJV from 'ajv';
import { CachedFN } from '@veto-party/baum__core';
import { FromSchema } from 'json-schema-to-ts';
import { FeatureContainer, IFeature } from './IFeature.js';


export abstract class AFeature<T extends {}|Record<string, any> = {}, From = T extends {} ? any[]|any : FromSchema<T>> implements IFeature<T, From> {

    protected constructor(
        private schema: T = {} as any,
        private ajv = new AJV.default()
    ) {}

    @CachedFN(true)
    protected async verfiyBaseSchema() {
        await this.ajv.validateSchema(this.schema, true);
    }

    public verifyObject(element: any): element is From {
        return this.ajv.validate(this.schema, element);
    }

    protected abstract mergeLayers(base: From|undefined, layers: From[]): From;
    
    public async ingestObject(objects: Record<string, FeatureContainer<From>>): Promise<From|From[]> {
        await this.verfiyBaseSchema();

        let checkedKeys = new Set<string>();

        let entries = Object.entries(objects);
        const extractByFilter = (filter: (obj: [string, FeatureContainer<From>]) => boolean) => {
            let removed = 0;
            const extractedEntries: [string, FeatureContainer<From>][] = [];  
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

        let currentLayer: [string, FeatureContainer<From>][] = extractByFilter(([, obj]) => obj.children.length === 0);

        let current: From|undefined = undefined;

        do {
            const newKeys = new Set(currentLayer.map(([, obj]) => obj.children).flat());

            // TODO: Improve these two lines using sets.
            currentLayer = extractByFilter(([key]) => newKeys.has(key));
            current = this.mergeLayers(current, currentLayer.map(([, obj]) => obj.feature));

            checkedKeys = checkedKeys.union(new Set(currentLayer.map(([key]) => key)));
        } while(currentLayer.length > 0);

        if (checkedKeys.intersection(new Set(Object.keys(entries))).size !== checkedKeys.size) {
            throw new Error('Invalid tree structure');
        }

        return current;
    }
}