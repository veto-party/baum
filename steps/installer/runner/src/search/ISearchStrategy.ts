export interface ISearchStrategy {
  search(base_dir: string): Promise<string[]>;
}
