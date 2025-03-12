import AJV from 'ajv';
import { CachedFN } from '@veto-party/baum__core';
import type { FromSchema } from 'json-schema-to-ts';
import type { IFeature, IngestResult, ToObjectWithPath } from '../interface/IFeature.js';
import type { FeatureContainer } from '../interface/IFeatureContainer.js';
import { get } from 'lodash-es';


export abstract class AFeature<T extends {}|Record<string, any> = {}, Path extends string|never = never, From = T extends {} ? any[]|any : FromSchema<T>,> implements IFeature<T, Path, From> {

    private ajv = new AJV.default();

    protected constructor(
        private schema: T = {} as any,
        private lookup: Path extends never ? undefined : Path = undefined as any
     ) {}

    @CachedFN(true)
    protected async verfiyBaseSchema() {
        await this.ajv.validateSchema(this.schema, true);
    }

    private getElementByLookupIfPresent(baseEl: any) {
        return this.lookup ? get(baseEl, this.lookup) : baseEl;
    }

    public getSchema(): T {
        return this.schema;
    }

    public getPath(): Path extends never ? undefined : Path {
        return this.lookup as any;
    }

    public verifyObject(element: any): element is ToObjectWithPath<Path, From> {
        return this.ajv.validate(this.schema, this.getElementByLookupIfPresent(element));
    }

    public ingestObject(objects: Record<string, FeatureContainer>): Promise<IngestResult<From>[]>|IngestResult<From>[] {

        const items = Object.entries(objects).map(([key, element]) => ({
            item: this.getElementByLookupIfPresent(element.feature),
            key,
            sourcePath: key
        }) satisfies IngestResult<From>);

        items.map((item) => item.item).forEach(this.verifyObject.bind(this));

        return items;
    }
}