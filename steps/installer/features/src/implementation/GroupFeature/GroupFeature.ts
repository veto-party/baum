import { IFeature } from "../../interface/IFeature.js";
import { AFeature } from "../../abstract/AFeature.js";
import { FromSchema } from "json-schema-to-ts";
import { clone, cloneDeep, merge, toPath } from "lodash-es";

type ToDefinitionStructure<Path extends string|undefined, Target> =   
    // No path is given, return target
    Path extends undefined ? Target: 
    // Path is given and contains . : return Key value pair recurisive 
    Path extends `${infer U}.${infer Rest}` ? {
        type: 'object';
        properties: Record<U, ToDefinitionStructure<Rest, Target>>
        additionalProperties: false;
    }:
    // Path is given contain contains array access : return never, since we do not want to allow array access (for now).
    Path extends `${infer U}[${infer index}]${infer Rest}` ? never :
    Path extends string ? {
        type: 'object';
        properties: Record<Path, Target>;
        additionalProperties: false;
    } :
    never;
export default ToDefinitionStructure;

export class GroupFeature<
    T extends {}|Record<string, any> = {}, 
    Path extends string|undefined = undefined, 
    From = T extends {} ? any[]|any : FromSchema<T>
> extends AFeature<T, Path, From> {

    private static basicSchemaStructure = {
        type: 'object',
        properties: {},
        additionalProperties: false
    } as const;

    constructor(value: T, path: Path) {
        super(value)
    }

    protected do_construct(newSchema: any, path: string|undefined): GroupFeature<any, any> {
        return new GroupFeature<T, Path>(newSchema, path as any);
    }

    appendFeature<T extends IFeature<any, any, any>>(feature: T): T extends IFeature<infer A, infer B, infer U> ? GroupFeature<T & ToDefinitionStructure<B, A>, Path> : never {

        const oldSchemaCloned = cloneDeep(this.getSchema());

        const newSchemaStructure = cloneDeep(GroupFeature.basicSchemaStructure);

        toPath(feature.getPath() ?? '').reduce((prev, current) => {
            prev[current] = cloneDeep(GroupFeature.basicSchemaStructure);
            return prev[current].properties;
        }, newSchemaStructure.properties as Record<string, any>);

        const newSchema = merge({}, newSchemaStructure, oldSchemaCloned);

        return this.do_construct(newSchema, this.getPath()) as any;
    }


}