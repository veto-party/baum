import type { asConst, FromSchema, JSONSchema } from 'json-schema-to-ts';
import { cloneDeep, set, toPath } from 'lodash-es';
import type { IFeature } from '../../interface/IFeature.js';
import { AFeature } from '../AFeature.js';
import type { ResolveFeaturePath } from '../types/MergeFeatures.js';
import type { ToDefinitionStructureWithTupleMerge } from '../types/ToDefinitionStructureWithTupleMerge.js';

export class GroupFeature<T extends {} | Record<string, any>, Path, From = T extends {} ? any[] | any : FromSchema<T>> extends AFeature<T, Path, From> {
  protected constructor(value: T, path: Path extends string ? Path : undefined) {
    super(value, path);
  }

  protected do_construct(newSchema: any, path: string | undefined): GroupFeature<any, Path> {
    return new GroupFeature<any, Path>(newSchema, path as any);
  }

  appendFeature<WritePath, Feature extends IFeature<any, any, any>>(
    writePath: WritePath,
    feature: Feature
  ): Feature extends IFeature<infer D, infer B, infer _>
    ? ReturnType<typeof asConst<ToDefinitionStructureWithTupleMerge<ResolveFeaturePath<WritePath, B extends string | undefined ? B : undefined>, D, T>>> extends infer Some
      ? GroupFeature<Some extends Record<string, any> ? Some : never, Path, FromSchema<Some extends JSONSchema ? Some : never>>
      : never
    : never {
    const oldSchemaCloned = cloneDeep(this.getSchema());
    set(oldSchemaCloned, toPath([writePath, feature.getPath()].filter(Boolean).join('.')), feature.getSchema());

    return this.do_construct(oldSchemaCloned, this.getPath()) as any;
  }
}
