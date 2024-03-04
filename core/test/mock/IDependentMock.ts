import { IDependent } from '../../src/index.js';

class IDependentMock implements IDependent {
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

export default IDependentMock;
