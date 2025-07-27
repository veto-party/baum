import type { IDependent } from "@veto-party/baum__core";

class DependentMock implements IDependent {
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

export default DependentMock;
