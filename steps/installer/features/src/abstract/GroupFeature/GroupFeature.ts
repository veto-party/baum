import { IFeature, ToDefinitionStructure } from "../../interface/IFeature.js";
import { AFeature } from "../AFeature.js";
import { asConst, FromSchema } from "json-schema-to-ts";
import { cloneDeep, set, merge, toPath } from "lodash-es";


type SomeFeature<T = any> = T extends any & IFeature<infer _, infer __, infer __> ? T : unknown;

export class GroupFeature<
    T extends {}|Record<string, any>, 
    Path ,
    From = T extends {} ? any[]|any : FromSchema<T>
> extends AFeature<T, Path, From> {

    protected constructor(value: T, path: Path extends string ? Path : undefined) {
        super(value, path)
    }

    protected do_construct(newSchema: any, path: string|undefined): GroupFeature<any, Path> {
        return new GroupFeature<any, Path>(newSchema, path as any);
    }

    appendFeature<
        WritePath, 
        Feature extends IFeature<any, any, any>
    >(
            writePath: WritePath extends undefined ? undefined : WritePath, 
            feature: SomeFeature<Feature>
        ): Feature extends IFeature<infer D, infer B, infer A> ? GroupFeature<
            ReturnType<typeof asConst<T & ToDefinitionStructure<WritePath extends string ? B extends string ? `${WritePath}.${B}` : WritePath : B extends string ? B : never, D>>>, 
            Path, 
            FromSchema<T & ToDefinitionStructure<WritePath extends string ? B extends string ? `${WritePath}.${B}` : WritePath : B extends string ? B : never, D>>
        > : unknown {

        const oldSchemaCloned = cloneDeep(this.getSchema());

        set(oldSchemaCloned, toPath(`${writePath ? `${writePath}.` : ''}${this.getPath()}`), feature.getSchema());

        return this.do_construct(oldSchemaCloned, this.getPath()) as any;
    }


}