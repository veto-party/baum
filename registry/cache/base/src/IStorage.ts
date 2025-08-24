
export interface IStorage {
    store(key: string, value: ((prev: any) => any|Promise<any>)|any): Promise<any>;
    flush(): Promise<any>;
}