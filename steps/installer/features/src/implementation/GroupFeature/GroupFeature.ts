import { IFeature } from "../../interface/IFeature.js";
import { AFeature } from "../../abstract/AFeature.js";
import { FromSchema } from "json-schema-to-ts";
import { cloneDeep, get, set, merge, toPath } from "lodash-es";

type ToDefinitionStructure<Path extends string|undefined, Target> =   
    // No path is given, return target
    Path extends undefined ? never: 
    // Path is given and contains . : return Key value pair recurisive 
    Path extends `${infer U}.${infer Rest}` ? {
        type: 'object';
        properties: Record<U, ToDefinitionStructure<Rest, Target>>
        additionalProperties: false;
    }:
    // Path is given contain contains array access : return never, since we do not want to allow array access (for now).
    Path extends `${infer U}[${infer index}]${infer Rest}` ? {
        type: 'object',
    } :
    Path extends string ? {
        type: 'object';
        properties: Record<Path, Target>;
        additionalProperties: false;
    } :
    never;

export class GroupFeature<
    T extends {}|Record<string, any> = {}, 
    Path extends string|undefined = undefined,
    WritePath extends string|undefined = undefined,
    From = T extends {} ? any[]|any : FromSchema<T>
> extends AFeature<T, Path, From> {

    private static basicSchemaStructure = {
        type: 'object',
        properties: {},
        additionalProperties: false
    } as const;

    constructor(value: T, path: Path, private writePath: WritePath = undefined as WritePath) {
        super(value, path)
    }

    protected do_construct(newSchema: any, path: string|undefined): GroupFeature<any, Path, WritePath> {
        return new GroupFeature<any, Path, WritePath>(newSchema, path as any, this.writePath as any);
    }

    protected get_write_path(): WritePath {
        return this.writePath;
    }

    appendFeature<Feature extends IFeature<any, any, any>>(feature: Feature): Feature extends IFeature<infer A, infer B, infer U> ? GroupFeature<T & ToDefinitionStructure<B, A>, Path> : never {

        const oldSchemaCloned = cloneDeep(this.getSchema());

        const newSchemaStructure = this.get_write_path() ? cloneDeep(
            get(this.getSchema(), this.get_write_path()!)!,
        ) : cloneDeep(GroupFeature.basicSchemaStructure);

        toPath(feature.getPath() ?? '').reduce((prev, current) => {
            prev[current] = cloneDeep(GroupFeature.basicSchemaStructure);
            return prev[current].properties;
        }, (newSchemaStructure as any).properties as Record<string, any>);

        const newResultingStructure = this.get_write_path() ? {} : newSchemaStructure;
        this.get_write_path() && set(newResultingStructure, this.get_write_path()!, newSchemaStructure);

        const newSchema = merge({}, newResultingStructure, oldSchemaCloned);

        return this.do_construct(newSchema, this.getPath()) as any;
    }


}