
const MERGE_ELEM_NOT_FOUND = Symbol('MERGE_ELEM_NOT_FOUND');

type MergeTuple<A extends any[], B extends any[]> = DoMergeTuple<A, A, B, B, []>;

type DoMergeTuple<A extends any[], AOriginal extends any[], B extends any[], BOriginal extends any[], Items extends any[]> = 
    AOriginal['length'] extends Items['length'] ?
        BOriginal extends Items['length'] ? 
            Items :
        [...Items, ...B] :
    BOriginal['length'] extends Items['length'] ?
        AOriginal['length'] extends Items['length'] ?
            Items :
        [...Items, ...A] :
    A extends [infer CurrentA, ...infer RestA] ? (
        B extends [infer CurrentB, ...infer RestB] ?
            DoMergeTuple<RestA, AOriginal, RestB, BOriginal, [...Items, MergeDeepForToDefinitionStructureWithTupleMerge<CurrentA, CurrentB>]> :
        B extends [infer CurrentB] ? 
            DoMergeTuple<RestA, AOriginal, [], BOriginal, [...Items, MergeDeepForToDefinitionStructureWithTupleMerge<CurrentA, CurrentB>]> :
        DoMergeTuple<RestA, AOriginal, [], BOriginal, [...Items, CurrentA]>
    ) :
    A extends [infer CurrentA] ? (
        B extends [infer CurrentB, ...infer RestB] ?
            DoMergeTuple<[], AOriginal, RestB, BOriginal, [...Items, MergeDeepForToDefinitionStructureWithTupleMerge<CurrentA, CurrentB>]> :
        B extends [infer CurrentB] ? 
            DoMergeTuple<[], AOriginal, [], BOriginal, [...Items, MergeDeepForToDefinitionStructureWithTupleMerge<CurrentA, CurrentB>]> :
        DoMergeTuple<[], AOriginal, [], BOriginal, [...Items, CurrentA]>
    ) :
    B extends [infer CurrentB, ...infer RestB] ? 
        A extends [infer CurrentA, ...infer RestA] ?
            DoMergeTuple<RestA, AOriginal, RestB, BOriginal, [...Items, MergeDeepForToDefinitionStructureWithTupleMerge<CurrentA, CurrentB>]> :
        A extends [infer CurrentA] ? 
            DoMergeTuple<[], AOriginal, RestB, BOriginal, [...Items, MergeDeepForToDefinitionStructureWithTupleMerge<CurrentA, CurrentB>]> :
        DoMergeTuple<[], AOriginal, RestB, BOriginal, [...Items, CurrentB]> :
    B extends [infer CurrentB] ? 
        A extends [infer CurrentA, ...infer RestA] ?
            DoMergeTuple<RestA, AOriginal, [], BOriginal, [...Items, MergeDeepForToDefinitionStructureWithTupleMerge<CurrentA, CurrentB>]> :
        A extends [infer CurrentA] ? 
            DoMergeTuple<[], AOriginal, [], BOriginal,  [...Items, MergeDeepForToDefinitionStructureWithTupleMerge<CurrentA, CurrentB>]> :
        DoMergeTuple<[], AOriginal, [], BOriginal, [...Items, CurrentB]> :
    never;

/**
 * This is a custom merge function
 */
export type MergeDeepForToDefinitionStructureWithTupleMerge<A, B> = 
    A extends typeof MERGE_ELEM_NOT_FOUND ? 
        B : 
    B extends typeof MERGE_ELEM_NOT_FOUND ? 
        A : 
    A extends any[] ? 
        B extends any[] ? 
            MergeTuple<A, B> :
        A :
    B extends any[] ?
        A extends any[] ? 
            MergeTuple<A, B> :
        B :
    A extends object ?
        B extends object ? 
            { [Key in (keyof (A & B))]: MergeDeepForToDefinitionStructureWithTupleMerge<Key extends keyof A ? A[Key] : typeof MERGE_ELEM_NOT_FOUND, Key extends keyof B ? B[Key] : typeof MERGE_ELEM_NOT_FOUND> } :
        A :
    B extends object ?
        A extends object ?
            { [Key in (keyof (A & B))]: MergeDeepForToDefinitionStructureWithTupleMerge<Key extends keyof A ? A[Key] : typeof MERGE_ELEM_NOT_FOUND, Key extends keyof B ? B[Key] : typeof MERGE_ELEM_NOT_FOUND> } :
        B :
    never;