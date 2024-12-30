export interface ICurrentVersionManager {
  getCurrentVersionFor(name: string): string | undefined | Promise<string | undefined>;
  updateCurrentVersionFor(name: string, version: string): void | Promise<void>;
  flush(): Promise<void>;
}
