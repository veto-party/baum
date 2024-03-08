import { IDependent } from '@veto-party/baum__core';

export class PNPMDependent implements IDependent {
  constructor(
    private name: string,
    private version: string
  ) {}

  getName(): string {
    return this.name;
  }
  getVersion(): string {
    return this.version ?? '0.0.0';
  }
}
