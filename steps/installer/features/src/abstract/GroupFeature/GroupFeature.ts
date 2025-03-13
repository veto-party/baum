import { definition } from "../../implementation/Variable/definition.js";
import { IFeature, KeyValuePair, MakeTuple, ToDefinitionStructure, type StringToNumber } from "../../interface/IFeature.js";
import { AFeature } from "../AFeature.js";
import { asConst, FromSchema, JSONSchema } from "json-schema-to-ts";
import { cloneDeep, set, toPath } from "lodash-es";


const NOT_FOUND = Symbol('ehhh');

export type MergeTuple<T, Original extends any[], N extends number = 1, Items extends any[] = []> = 
    N extends Items['length'] ? 
        Original extends [infer Current, ...infer Rest] ? 
            [...Items, Current & T, ...Rest] : 
        Original extends [infer Current] ?
            [...Items, T & Current] :
        [...Items, T] : 
    Original extends [infer Current, ...infer Rest] ? 
        MergeTuple<T, Rest, N, [...Items, Current]> :
    Original extends [infer Current] ? 
        MergeTuple<T, [], N, [...Items, Current]> : 
    MergeTuple<T, [], N, [...Items, void]>; 

type GetDefinitionStructure<Target, Path> =
        // No path is given, return target
    Path extends undefined ? Target :

    Target extends typeof NOT_FOUND ? Target : 

    Path extends string ?

        Path extends '' ? 
            Target :  
        Path extends keyof Target ?
            Target[Path] : 
        // Path is given and contains . : return Key value pair recurisive 
        Path extends `["${infer Path}"]` ?  
            Path extends keyof Target ?  
                Target[Path] : 
            typeof NOT_FOUND & { reason: 'PATH_NOT_FOUND'} : 
        Path extends `[${infer index}]` ? 
            Target extends any[] ? 
            StringToNumber<index, number, number> extends infer INDEX ? 
                INDEX extends number ? 
                    Target[INDEX] : 
                    never : 
                never : 
            typeof NOT_FOUND & { reason: 'INDEX_NOT_FOUND' } : 

        Path extends `${infer U}["${infer Path}"]"` ?
            GetDefinitionStructure<Target, U> extends infer AResult ?
                Path extends infer APath ?
                    APath extends keyof AResult ? 
                        AResult[APath] : 
                    typeof NOT_FOUND & { reason: '1' } : 
                typeof NOT_FOUND & { reason: '2' } : 
            typeof NOT_FOUND & { reason: '2_1' } : 
        Path extends `${infer U}[${infer index}]` ?  
            GetDefinitionStructure<Target, U> extends infer AResult ? 
                AResult extends any[] ? 
                    StringToNumber<index, number, number> extends infer INDEX ?
                        INDEX extends number ?
                            AResult[INDEX] :
                        typeof NOT_FOUND & { reason: '5_1' } :
                    typeof NOT_FOUND & { reason: '5_2' } :
                typeof NOT_FOUND & { reason: '5_3' } :
            typeof NOT_FOUND & { reason: '5' } : 

        // Aray witn prefix
        Path extends `${infer U}["${infer Path}"].${infer Rest}` ? 
            GetDefinitionStructure<Target, U> extends infer R0 ?  
                Path extends keyof R0 ?  
                    GetDefinitionStructure<R0[Path], Rest> : 
                typeof NOT_FOUND & { reason: '6' } :
            typeof NOT_FOUND & { reason: '7' } :
        Path extends `${infer U}[${infer index}].${infer Rest}` ? 
            GetDefinitionStructure<Target, U> extends infer R0 ?
                R0 extends any[] ? 
                    GetDefinitionStructure<R0[StringToNumber<index, number, number>], Rest> :
                typeof NOT_FOUND & { reason: '7' } : 
            typeof NOT_FOUND & { reason: '7' } :

        // Path is given contain contains array access : return unknown, since we do not want to allow array access (for now).
        Path extends `["${infer Path}"].${infer Rest}` ?
            Path extends keyof Target ?
                GetDefinitionStructure<Target[Path], Rest> :
            typeof NOT_FOUND & { reason: '9' } :
        Path extends `[${infer index}].${infer Rest}` ?
            Target extends any[] ?
                GetDefinitionStructure<Target[StringToNumber<index, number, number>], Rest> :
            typeof NOT_FOUND & { reason: '10' } :
        Path extends `${infer U}.${infer Rest}` ?
            GetDefinitionStructure<GetDefinitionStructure<Target, U>, Rest> :
        typeof NOT_FOUND & { reason: '12' } :
    Target;

type SomeTest = GetDefinitionStructure<{
    items: {
        patternProperties: [{ test: 1}, { properties: {}, ehllo: 'world' }]
    }
}, 'items.patternProperties'>;

type SomeTest2 = GetDefinitionStructure<GetDefinitionStructure<{
    items: {
        patternProperties: [{ test: 1}, { properties: {}, ehllo: 'world' }]
    }
}, 'items'>, 'patternProperties'>;

export type ToDefinitionStructureWithTupleMerge<Path, Target, Obj> =

    // No path is given, return target
    Path extends undefined ? Target :

    Path extends string ?( 

        Path extends '' ? Target  :

        // Path is given and contains . : return Key value pair recurisive 
        Path extends `["${infer Path}"]` ? KeyValuePair<Path, Target> & Obj  :
        Path extends `[${infer index}]` ? Obj extends any[] ? 
            MergeTuple<Target, Obj, StringToNumber<index>> : MakeTuple<Target, StringToNumber<index>> :

        Path extends `${infer U}["${infer Path}"]"` ? ( 
            GetDefinitionStructure<Obj, U> extends infer NEWOBJ ? 
                NEWOBJ extends typeof NOT_FOUND ? 
                    ToDefinitionStructure<U, KeyValuePair<Path, Target>>  : 
                ToDefinitionStructureWithTupleMerge<U, KeyValuePair<Path, Target> & NEWOBJ, Obj> : 
            ToDefinitionStructure<U, KeyValuePair<Path, Target>> 
        ) & Obj :
        Path extends `${infer U}[${infer index}]` ? (
            GetDefinitionStructure<Obj, U> extends infer NEWOBJ ? 
                NEWOBJ extends typeof NOT_FOUND ?
                    ToDefinitionStructure<U, MakeTuple<Target, StringToNumber<index>>> : 
                NEWOBJ extends any[] ?
                            ToDefinitionStructureWithTupleMerge<U, MergeTuple<Target, NEWOBJ, StringToNumber<index>>, Obj> : 
                        ToDefinitionStructure<U, MakeTuple<Target, StringToNumber<index>>> :  
                    ToDefinitionStructure<U, MakeTuple<Target, StringToNumber<index>>> 
        ) & Obj :

        // Aray witn prefix
        Path extends `${infer Prev}["${infer U}"].${infer Rest}` ? (  
            GetDefinitionStructure<Obj, Prev> extends infer P0 ? 
                P0 extends typeof NOT_FOUND ? 
                    ToDefinitionStructure<Prev, KeyValuePair<U, ToDefinitionStructure<Rest, Target>>> :  
                ToDefinitionStructureWithTupleMerge<U, KeyValuePair<U, ToDefinitionStructureWithTupleMerge<Rest, Target, P0>>, Obj>  : 
            ToDefinitionStructure<U, KeyValuePair<U, ToDefinitionStructure<Rest, Target>>> 
        ) & Obj :
        Path extends `${infer U}[${infer index}].${infer Rest}` ? (
            GetDefinitionStructure<Obj, U> extends infer P0 ? 
                P0 extends typeof NOT_FOUND ? 
                    ToDefinitionStructure<U, MakeTuple<ToDefinitionStructure<Rest, Target>, StringToNumber<index>>> : 
                P0 extends any[] ? 
                    ToDefinitionStructureWithTupleMerge<U, MergeTuple<ToDefinitionStructureWithTupleMerge<Rest, Target, Obj>, P0, StringToNumber<index>>, Obj> :
                ToDefinitionStructure<U, MakeTuple<ToDefinitionStructure<Rest, Target>, StringToNumber<index>>> :
            ToDefinitionStructure<U, MakeTuple<ToDefinitionStructure<Rest, Target>, StringToNumber<index>>>
        ) & Obj :
        // Path is given contain contains array access : return unknown, since we do not want to allow array access (for now).
        Path extends `["${infer U}"].${infer Rest}` ? (  
            U extends keyof Obj ? 
                KeyValuePair<U, ToDefinitionStructureWithTupleMerge<Rest, Target, Obj[U]>> :
            KeyValuePair<U, ToDefinitionStructure<Rest, Target>> 
        ) & Obj :
        Path extends `[${infer index}].${infer Rest}` ? 
            Obj extends any[] ? 
                MergeTuple<ToDefinitionStructureWithTupleMerge<Rest, Target, Obj>, Obj, StringToNumber<index>> :
            MakeTuple<ToDefinitionStructure<Rest, Target>, StringToNumber<index>> : 

        Path extends `${infer U}.${infer Rest}` ? ( 
            U extends keyof Obj ? KeyValuePair<U, ToDefinitionStructureWithTupleMerge<Rest, Target, Obj[U]>>  : 
                GetDefinitionStructure<Obj, U> extends infer NEWOBJ ? 
                    NEWOBJ extends typeof NOT_FOUND ? 
                        ToDefinitionStructure<U, ToDefinitionStructure<Rest, Target>>  : 
                    ToDefinitionStructureWithTupleMerge<U, ToDefinitionStructureWithTupleMerge<Rest, Target, NEWOBJ>, Obj> : 
            ToDefinitionStructure<U, ToDefinitionStructure<Rest, Target>> 
        ) & Obj :
        KeyValuePair<Path, Target> 
    )
    : Target;

type SomeFeature<T = any> = T extends any & IFeature<infer _, infer __, infer __> ? T : unknown;

type Test2Path = GetDefinitionStructure<{
    items: {
        patternProperties: [{ test: 1}, { properties: {}, ehllo: 'world' }]
    }
}, 'items.patternProperties'>;

// TODO: array type --------------------------------
type Test2 = ToDefinitionStructureWithTupleMerge<'items.patternProperties[1].test123', { type: 'object'; }, {
    items: {
        patternProperties: [{ test: 1}, { properties: {}, ehllo: 'world' }]
    }
}>;


export class GroupFeature<
    T extends {}|Record<string, any>, 
    Path,
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
        ): Feature extends IFeature<infer D, infer B, infer A> ? ReturnType<typeof asConst<ToDefinitionStructureWithTupleMerge<WritePath extends string ? B extends string ? `${WritePath}.${B}` : WritePath : B extends string ? B : never, D, T>>> extends infer Some ? GroupFeature<
            Some extends Record<string, any> ? Some : never,
            Path, 
            FromSchema<Some extends JSONSchema ? Some : never>
        > : unknown : unknown {

        const oldSchemaCloned = cloneDeep(this.getSchema());

        set(oldSchemaCloned, toPath(`${writePath ? `${writePath}.` : ''}${this.getPath()}`), feature.getSchema());

        return this.do_construct(oldSchemaCloned, this.getPath()) as any;
    }


}