import type { IDependent } from '../../index.js';

export class GenericDependent implements IDependent {
  constructor(
    private name: string,
    private version: string
  ) {}

  getName(): string {
    return this.name;
  }
  getVersion(): string {
    return this.version;
  }
}
