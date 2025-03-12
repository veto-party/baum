import { IFeature, KeyValuePair, type StringToNumber } from "../../interface/IFeature.js";
import { AFeature } from "../AFeature.js";
import { asConst, FromSchema } from "json-schema-to-ts";
import { cloneDeep, set, toPath } from "lodash-es";


export type MergeTuple<T, Original extends any[], N extends number = 1, Items extends any[] = []> = N extends Items['length'] ?[...Items, T] : MergeTuple<T, N, [void, ...Items]>;

type GetDefinitionStructure<Target, Path> =
        // No path is given, return target
    Path extends undefined ? Target :

    Path extends string ? 

        Path extends '' ? Target :

        // Path is given and contains . : return Key value pair recurisive 
        Path extends `["${infer Path}"]` ? Path extends keyof Target ? Target[Path] : never :
        Path extends `[${infer index}]` ? Target extends any[] ? Target[StringToNumber<index>] : never :

        Path extends `${infer U}["${infer Path}"]"` ? 
            GetDefinitionStructure<U, Target> extends infer AResult ? 
                Path extends infer APath ? APath extends keyof AResult ? AResult[APath] : never : 
            never :
        Path extends `${infer U}[${infer index}]` ? 
            GetDefinitionStructure<U, Target> extends infer AResult ? 
                Path extends infer APath ? 
                    AResult extends any[] ? 
                        APath extends StringToNumber<index> ? AResult[APath] : never : 
                never : 
            never :

        // Aray witn prefix
        Path extends `${infer U}["${infer Path}"].${infer Rest}` ? 
            GetDefinitionStructure<U, Target> extends infer R0 ? 
                Path extends keyof R0 ? GetDefinitionStructure<R0[Path], Rest> : never :
            never :
        Path extends `${infer U}[${infer index}].${infer Rest}` ? 
            GetDefinitionStructure<Target, U> extends infer R0 ? R0 extends any[] ? 
                GetDefinitionStructure<R0[StringToNumber<index, number, number>], Rest> : never : 
            never :
        // Path is given contain contains array access : return unknown, since we do not want to allow array access (for now).
        Path extends `["${infer Path}"].${infer Rest}` ? 
            Path extends keyof Target ? 
                GetDefinitionStructure<Rest, Target[Path]> : 
            never :
        Path extends `[${infer index}].${infer Rest}` ? 
            Target extends any[] ? GetDefinitionStructure<Target[StringToNumber<index, number, number>], Rest> : never 
        : never :

        Path extends `${infer U}.${infer Rest}` ? 
            GetDefinitionStructure<U, GetDefinitionStructure<Rest, Target>> :
        never :
        Path extends keyof Target ? Target[Path] : never :
    Target;

export type ToDefinitionStructureWithTupleMerge<Path, Target, Obj> =

    Path extends string ?

        // No path is given, return target
        Path extends undefined ? Target: 

        Path extends '' ? Target :

        // Path is given and contains . : return Key value pair recurisive 
        Path extends `["${infer Path}"]` ? KeyValuePair<Path, Target> :
        Path extends `[${infer index}]` ? Obj extends any[] ? MergeTuple<Target, Obj, StringToNumber<index>> : never :

        Path extends `${infer U}["${infer Path}"]"` ? ToDefinitionStructureWithTupleMerge<U, KeyValuePair<Path, Target>, GetDefinitionStructure<Obj, U>> :
        Path extends `${infer U}[${infer index}]` ? Obj extends any[] ? ToDefinitionStructureWithTupleMerge<U, MergeTuple<Target, Obj, StringToNumber<index>>, GetDefinitionStructure<Obj, U>> : never :

        // Aray witn prefix
        Path extends `${infer U}["${infer Path}"].${infer Rest}` ?  GetDefinitionStructure<Obj, U> extends infer P0 ? Path extends keyof P0 ? ToDefinitionStructureWithTupleMerge<U, KeyValuePair<Path, ToDefinitionStructureWithTupleMerge<Rest, Target, P0[Path]>>, Obj> : never : never :
        Path extends `${infer U}[${infer index}].${infer Rest}` ? GetDefinitionStructure<Obj, U> extends infer P0 ? P0 extends any[] ? ToDefinitionStructureWithTupleMerge<U, MergeTuple<ToDefinitionStructureWithTupleMerge<Rest, Target, P0[StringToNumber<index>]>, P0, StringToNumber<index>>, Obj> : never : never :
        // Path is given contain contains array access : return unknown, since we do not want to allow array access (for now).
        Path extends `["${infer Path}"].${infer Rest}` ?  Path extends keyof Obj ? KeyValuePair<Path, ToDefinitionStructureWithTupleMerge<Rest, Target, Obj[Path]>> : never :
        Path extends `[${infer index}].${infer Rest}` ? Obj extends any[] ? MergeTuple<ToDefinitionStructureWithTupleMerge<Rest, Target, Obj[StringToNumber<index>]>, Obj, StringToNumber<index>> : never : 

        Path extends `${infer U}.${infer Rest}` ? U extends keyof Obj ? ToDefinitionStructureWithTupleMerge<U, ToDefinitionStructureWithTupleMerge<Rest, Target, GetDefinitionStructure<Obj, U>>, Obj> : never :
        KeyValuePair<Path, Target>
    : Target;

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
            ReturnType<typeof asConst<ToDefinitionStructureWithTupleMerge<WritePath extends string ? B extends string ? `${WritePath}.${B}` : WritePath : B extends string ? B : never, D, T>>>, 
            Path, 
            FromSchema<ToDefinitionStructureWithTupleMerge<WritePath extends string ? B extends string ? `${WritePath}.${B}` : WritePath : B extends string ? B : never, D, T>>
        > : unknown {

        const oldSchemaCloned = cloneDeep(this.getSchema());

        set(oldSchemaCloned, toPath(`${writePath ? `${writePath}.` : ''}${this.getPath()}`), feature.getSchema());

        return this.do_construct(oldSchemaCloned, this.getPath()) as any;
    }


}