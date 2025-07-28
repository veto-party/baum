import type { INameTransformer } from '../../INameTransformer.js';

export class SwitchNameTransformer implements INameTransformer {
  private swichedNames: Record<string, boolean> = {};

  public constructor(
    private defaultTransformer: INameTransformer,
    private alternativeTransformer: INameTransformer
  ) {}

  getName(name: string): string {
    if (this.swichedNames[name]) {
      return this.alternativeTransformer.getName(name);
    }

    return this.defaultTransformer.getName(name);
  }

  enableOverrideFor(name: string): void {
    this.swichedNames[name] = true;
  }

  getOverrideName(name: string): string {
    return this.alternativeTransformer.getOverrideName(name);
  }

  getDefaultName(name: string): string {
    return this.defaultTransformer.getDefaultName(name);
  }
}
