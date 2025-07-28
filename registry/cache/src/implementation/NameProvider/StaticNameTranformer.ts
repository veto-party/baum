import type { INameTransformer } from '../../INameTransformer.js';

export class StaticNameTranformer implements INameTransformer {
  public constructor(private prefix: string = '@internal') {}

  enableOverrideFor(_name: string): void {
    /** NO-OP */
  }

  getName(name: string): string {
    return `${this.prefix}${name.split('@').join('').split('/').join('__')}`;
  }
  getOverrideName(name: string): string {
    return this.getName(name);
  }
  getDefaultName(name: string): string {
    return this.getName(name);
  }
}
