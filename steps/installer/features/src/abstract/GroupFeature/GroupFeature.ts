import { IFeature } from "../../interface/IFeature.js";
import { AFeature } from "../AFeature.js";
import { asConst, FromSchema } from "json-schema-to-ts";
import { cloneDeep, set, merge, toPath } from "lodash-es";

type StringToNumber<S extends string> = 
  S extends "0" ? 0 :
  S extends "1" ? 1 :
  S extends "2" ? 2 :
  S extends "3" ? 3 :
  S extends "4" ? 4 :
  S extends "5" ? 5 :
  S extends "6" ? 6 :
  S extends "7" ? 7 :
  S extends "8" ? 8 :
  S extends "9" ? 9 :
  never;

 
type MakeTuple<T, N extends number = 1, Items extends any[] = []> = N extends Items['length'] ? Items extends [infer _, ...infer All] ? [...All, T] : never : MakeTuple<T, N, [never, ...Items]>;

type KeyValuePair<A extends string|never, Target> = { [key in A]: Target }; 

type ToDefinitionStructure<Path extends string|never, Target> =
    // No path is given, return target
    Path extends never ? never: 

    Path extends '' ? Target : 
    // Aray witn prefix


    Path extends `${infer U}.${infer Rest}` ? ToDefinitionStructure<U, ToDefinitionStructure<Rest, Target>> :
    Path extends `${infer U}["${infer Path}"].${infer Rest}` ?  ToDefinitionStructure<U, KeyValuePair<Path, ToDefinitionStructure<Rest, Target>>> :
    Path extends `${infer U}[${infer index}].${infer Rest}` ? ToDefinitionStructure<U, MakeTuple<ToDefinitionStructure<Rest, Target>, StringToNumber<index>>> : 
    // Path is given contain contains array access : return never, since we do not want to allow array access (for now).
    Path extends `["${infer Path}"].${infer Rest}` ?  ToDefinitionStructure<Path, ToDefinitionStructure<Rest, Target>> :
    Path extends `[${infer index}].${infer Rest}` ? MakeTuple<ToDefinitionStructure<Rest, Target>, StringToNumber<index>> : 
    // Path is given and contains . : return Key value pair recurisive 

    Path extends `["${infer Path}"]` ? KeyValuePair<Path, Target> :
    Path extends `[${infer index}]` ? MakeTuple<Target, StringToNumber<index>> :
    KeyValuePair<Path, Target>;


export type A = 'A["hello"].properties';
export type B = 'data';

type Resolved = ToDefinitionStructure<`${A}.${B}`, true>;

export class GroupFeature<
    T extends {}|Record<string, any> = {}, 
    Path extends string|never = never,
    From = T extends {} ? any[]|any : FromSchema<T>
> extends AFeature<T, Path, From> {

    protected constructor(value: T, path: Path extends never ? undefined : Path) {
        super(value, path)
    }

    protected do_construct(newSchema: any, path: string|undefined): GroupFeature<any, Path> {
        return new GroupFeature<any, Path>(newSchema, path as any);
    }

    appendFeature<
        WritePath extends string|never, 
        Feature extends IFeature<any, any, any>>(
            writePath: WritePath extends never ? undefined : WritePath, 
            feature: Feature
        ): Feature extends IFeature<infer D, infer B, infer A> ? GroupFeature<
            ReturnType<typeof asConst<T & ToDefinitionStructure<WritePath extends never ? B : B extends never ? WritePath : `${WritePath}.${B}`, D>>>, 
            Path, 
            FromSchema<T & ToDefinitionStructure<WritePath extends never ? B : B extends never ? WritePath : `${WritePath}.${B}`, D>>
        > : never {

        const oldSchemaCloned = cloneDeep(this.getSchema());

        set(oldSchemaCloned, toPath(`${writePath ? `${writePath}.` : ''}${this.getPath()}`), feature.getSchema());

        return this.do_construct(oldSchemaCloned, this.getPath()) as any;
    }


}