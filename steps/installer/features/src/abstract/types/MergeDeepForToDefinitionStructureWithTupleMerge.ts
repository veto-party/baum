
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
    A extends typeof MERGE_ELEM_NOT_FOUND ? B : B extends typeof MERGE_ELEM_NOT_FOUND ? A : 
    A extends any[] ? 
        B extends any[] ? 
            MergeTuple<A, B> :
        never :
    B extends any[] ?
        A extends any[] ? 
            MergeTuple<A, B> :
        never :
    A extends Record<string|symbol, any> ? 
        B extends Record<string|symbol, any> ? 
            Extract<keyof A, keyof B> extends infer Keys ? 
                Keys extends string|number|symbol ? 
                    { [Key in Keys]: MergeDeepForToDefinitionStructureWithTupleMerge<Key extends keyof A ? A[Key] : typeof MERGE_ELEM_NOT_FOUND, Key extends keyof B ? B[Key] : typeof MERGE_ELEM_NOT_FOUND> } & (Omit<A, Keys> & Omit<B, Keys>) :
                Omit<A, keyof B> & Omit<B, keyof A> :
            Omit<A, keyof B> & Omit<B, keyof A> :
        Omit<A, keyof B> & Omit<B, keyof A> :
    (A & B);  