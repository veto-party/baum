export type MakeTuple<T, N extends number = 1, Items extends any[] = []> = N extends Items['length'] ? [...Items, T] : MakeTuple<T, N, [void, ...Items]>;
