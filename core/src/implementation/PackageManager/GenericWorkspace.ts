import FileSystem from 'node:fs';
import Path from 'node:path';
import isEqual from 'lodash.isequal';
import uniqBy from 'lodash.uniqby';
import { CachedFN, clearCacheForFN, type IDependent, type IWorkspace, Resolver } from '../../index.js';
import { GenericDependent } from './GenericDependent.js';

export class GenericWorkspace implements IWorkspace {
  private overrides: Record<string, string> = {};

  constructor(
    private directory: string,
    private pkgFile: any,
    private modifyToRealVersionValue: (version: string) => string | false | undefined
  ) {}

  @CachedFN(false)
  setOverrides(overrides: Record<string, string>): void {
    this.overrides = overrides;
    clearCacheForFN(this, 'getDynamicDependents');
    clearCacheForFN(this, 'setOverrides');
  }

  getFreshWorkspace(): IWorkspace {
    const newPackage = JSON.parse(FileSystem.readFileSync(Path.join(this.directory, 'package.json')).toString());

    if (isEqual(newPackage, this.pkgFile)) {
      return this;
    }

    return new GenericWorkspace(this.directory, JSON.parse(FileSystem.readFileSync(Path.join(this.directory, 'package.json')).toString()), this.modifyToRealVersionValue);
  }

  getOverrides(): Record<string, string> {
    return this.pkgFile?.overrides ?? {};
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
    const dependencies = Resolver.resolve(this.directory, this.pkgFile, this.overrides).map(([name, version]) => new GenericDependent(name, version));
    return dependencies.filter((dependent) => !dependent.getVersion().startsWith('file:'));
  }

  getScriptNames(): string[] {
    return this.pkgFile.scripts ? Object.keys(this.pkgFile.scripts) : [];
  }

  isPublishable(): boolean {
    return this.pkgFile.private !== true;
  }
}
