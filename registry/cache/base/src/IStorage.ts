export interface IStorage {
  resolve(key: string): Promise<any | undefined>;
  store(key: string, value: ((prev: any) => any | Promise<any>) | any): Promise<any>;
  flush(): Promise<any>;
}
