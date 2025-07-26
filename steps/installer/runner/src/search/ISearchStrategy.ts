
export type ISearchStrategyResult = {
  packagePath: string;
  resultPath: string;
}

export interface ISearchStrategy {
  search(base_dir: string): Promise<ISearchStrategyResult[]>;
}
