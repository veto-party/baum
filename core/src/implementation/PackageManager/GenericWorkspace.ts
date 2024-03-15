import FileSystem from 'fs';
import Path from 'path';
import isEqual from 'lodash.isequal';
import uniqBy from 'lodash.uniqby';
import { CachedFN, IDependent, IWorkspace } from '../../index.js';
import { GenericDependent } from './GenericDependent.js';

export class GenericWorkspace implements IWorkspace {
  constructor(
    private directory: string,
    private pkgFile: any,
    private modifyToRealVersionValue: (version: string) => string | false | undefined
  ) { }

  getFreshWorkspace(): IWorkspace {

    const newPackage = JSON.parse(FileSystem.readFileSync(Path.join(this.directory, 'package.json')).toString());

    if (isEqual(newPackage, this.pkgFile)) {
      return this;
    }

    return new GenericWorkspace(
      this.directory,
      JSON.parse(FileSystem.readFileSync(Path.join(this.directory, 'package.json')).toString()),
      this.modifyToRealVersionValue
    );
  }

  getName(): string {
    return this.pkgFile.name;
  }

  getVersion(): string {
    return this.pkgFile.version ?? '*';
  }

  getDirectory(): string {
    return this.directory;
  }

  getPackageFile() {
    return this.pkgFile;
  }

  @CachedFN(false)
  getDynamicDependents(): IDependent[] {
    const dependents = [
      Object.entries(this.pkgFile.dependencies ?? {})
        .map(([name, version]) => [name, this.modifyToRealVersionValue(version as string) || version] as const)
        .filter((pkg): pkg is [string, string] => !!typeof pkg[1])
        .map(([name, version]) => new GenericDependent(name, version)),
      Object.entries(this.pkgFile.devDependencies ?? {})
        .map(([name, version]) => [name, this.modifyToRealVersionValue(version as string) || version] as const)
        .filter((pkg): pkg is [string, string] => !!typeof pkg[1])
        .map(([name, version]) => new GenericDependent(name, version)),
      Object.entries(this.pkgFile.optionalDependencies ?? {})
        .map(([name, version]) => [name, this.modifyToRealVersionValue(version as string) || version] as const)
        .filter((pkg): pkg is [string, string] => !!typeof pkg[1])
        .map(([name, version]) => new GenericDependent(name, version)),
      Object.entries(this.pkgFile.peerDependencies ?? {})
        .map(([name, version]) => [name, this.modifyToRealVersionValue(version as string) || version] as const)
        .filter((pkg): pkg is [string, string] => !!typeof pkg[1])
        .map(([name, version]) => new GenericDependent(name, version))
    ].flat();

    return uniqBy(dependents, (d) => `${d.getName()}@${d.getVersion()}`).filter((dependent) => !dependent.getVersion().startsWith("file:"));
  }

  getScriptNames(): string[] {
    return this.pkgFile.scripts ? Object.keys(this.pkgFile.scripts) : [];
  }

  isPublishable(): boolean {
    return this.pkgFile.private !== true;
  }
}
