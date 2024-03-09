import uniqBy from 'lodash.uniqby';
import { IDependent, IWorkspace } from '../../index.js';
import { GenericDependent } from './GenericDependent.js';

export class GenericWorkspace implements IWorkspace {
  constructor(
    private directory: string,
    private pkgFile: any,
    private checkForExternal: (version: string) => string | false | undefined
  ) { }

  getName(): string {
    return this.pkgFile.name;
  }

  getVersion(): string {
    return this.pkgFile.version ?? '*';
  }

  getDirectory(): string {
    return this.directory;
  }

  getDynamicDependents(): IDependent[] {
    const dependents = [
      Object.entries(this.pkgFile.dependencies ?? {})
        .map(([name, version]) => [name, this.checkForExternal(version as string)] as const)
        .filter((pkg): pkg is [string, string] => typeof pkg[1] === "string")
        .map(([name, version]) => new GenericDependent(name, version)),
      Object.entries(this.pkgFile.devDependencies ?? {})
        .map(([name, version]) => [name, this.checkForExternal(version as string)] as const)
        .filter((pkg): pkg is [string, string] => typeof pkg[1] === "string")
        .map(([name, version]) => new GenericDependent(name, version)),
      Object.entries(this.pkgFile.optionalDependencies ?? {})
        .map(([name, version]) => [name, this.checkForExternal(version as string)] as const)
        .filter((pkg): pkg is [string, string] => typeof pkg[1] === "string")
        .map(([name, version]) => new GenericDependent(name, version)),
      Object.entries(this.pkgFile.peerDependencies ?? {})
        .map(([name, version]) => [name, this.checkForExternal(version as string)] as const)
        .filter((pkg): pkg is [string, string] => typeof pkg[1] === "string")
        .map(([name, version]) => new GenericDependent(name, version))
    ].flat();

    return uniqBy(dependents, (d) => `${d.getName()}@${d.getVersion()}`);
  }

  getScriptNames(): string[] {
    return this.pkgFile.scripts ? Object.keys(this.pkgFile.scripts) : [];
  }

  isPublishable(): boolean {
    return this.pkgFile.private !== true;
  }
}
