import type { IDependent, IWorkspace } from '../../src/index.js';
import IDependentMock from './IDependentMock.js';

class IWorkspaceMock implements IWorkspace {
  constructor(
    private name: string,
    private version: string,
    private dependents: IDependent[]
  ) {}

  getFreshWorkspace(): IWorkspace {
    return this;
  }

  getName(): string {
    return this.name;
  }
  getVersion(): string {
    return this.version;
  }
  getDynamicDependents(): IDependent[] {
    return this.dependents;
  }

  getPackageFile() {
    // gets the package file as an object. (E.g. package.json content) to be used in the app.
    throw new Error('Method not implemented.');
  }

  toDepdendent() {
    return new IDependentMock(this.name, this.version);
  }

  getDirectory(): string {
    // is required for execution of commands relative to package, since we want to test the tree shaking, we dont need that right now.
    return "ehhh";
    // is used for logging now.
  }
  getScriptNames(): string[] {
    // is required for execution of commands, to check if the package exists?
    throw new Error('Method not implemented.');
  }
  isPublishable(): boolean {
    // Checks if the package can be public.
    throw new Error('Method not implemented.');
  }
}

export default IWorkspaceMock;
