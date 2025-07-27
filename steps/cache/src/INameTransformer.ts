
export interface INameTransformer {
  getName(name: string): string;
  getOverrideName(name: string): string;
  getDefaultName(name: string): string;
  enableOverrideFor(name: string): void;
}