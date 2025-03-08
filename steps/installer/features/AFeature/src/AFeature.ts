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

    
    public async ingestObject(objects: Record<string, FeatureContainer<From>>): Promise<From|From[]> {
        await this.verfiyBaseSchema();
        return Object.values(objects).map((el) => el.feature);
    }
}