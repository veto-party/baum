import { CachedFN } from '@veto-party/baum__core';
import AJV from 'ajv';
import type { FromSchema } from 'json-schema-to-ts';
import { get } from 'lodash-es';
import type { IFeature, IngestResult } from '../interface/IFeature.js';
import type { FeatureContainer } from '../interface/IFeatureContainer.js';
import type { ToDefinitionStructure } from '../interface/types/ToDefinitionStructure.js';

export abstract class AFeature<T extends {} | Record<string, any>, Path, From = T extends {} ? any[] | any : FromSchema<T>> implements IFeature<T, Path, From> {
  private ajv = new AJV.default();

  protected constructor(
    private schema: T,
    private lookup: Path extends string ? Path : undefined
  ) {}

  @CachedFN(true)
  protected async verfiyBaseSchema() {
    await this.ajv.validateSchema(this.schema, true);
  }

  private getElementByLookupIfPresent(baseEl: any) {
    return this.lookup ? get(baseEl, this.lookup as string) : baseEl;
  }

  public getSchema(): T {
    return this.schema;
  }

  public getPath(): Path extends string ? Path : undefined {
    return this.lookup as any;
  }

  public verifyObject(element: any): element is ToDefinitionStructure<Path, From> {
    return this.ajv.validate(this.schema, this.getElementByLookupIfPresent(element));
  }

  public ingestObject(objects: Record<string, FeatureContainer>): Promise<IngestResult<From>[]> | IngestResult<From>[] {
    const items = Object.entries(objects).map(
      ([key, element]) =>
        ({
          item: this.getElementByLookupIfPresent(element.feature),
          key,
          sourcePath: key
        }) satisfies IngestResult<From>
    );

    items.map((item) => item.item).forEach(this.verifyObject.bind(this));

    return items;
  }
}
