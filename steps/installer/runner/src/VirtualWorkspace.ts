import { dirname } from 'node:path';
import { CachedFN, clearCacheForFN, type IDependent, type IWorkspace, Resolver } from '@veto-party/baum__core';
import { InferStructure } from '@veto-party/baum__steps__installer__renderer/src/interface/IRenderer.js';
import { VirtualDependent } from './VirtualDependent.js';

export class VirtualWorkspace<T> implements IWorkspace {
  private directory: string;
  private overrides: Record<string, string> = {};

  constructor(
    private packageName: string,
    private packageVersion: string,
    packagePath: string,
    private packageContent: any
  ) {
    this.directory = dirname(packagePath);
  }

  getName(): string {
    return this.packageName;
  }

  getVersion(): string {
    return this.packageVersion;
  }

  getDirectory(): string {
    return this.directory;
  }

  getFreshWorkspace(): IWorkspace {
    return this;
  }

  getOverrides(): Record<string, string> {
    return this.packageContent?.overrides ?? {};
  }

  @CachedFN(false)
  setOverrides(overrides: Record<string, string>): void {
    this.overrides = overrides;
    clearCacheForFN(this, 'setOverrides');
    clearCacheForFN(this, 'getDynamicDependents');
  }

  @CachedFN(false)
  getDynamicDependents(): IDependent[] {
    const dependencies = Resolver.resolve(this.directory, this.packageContent, this.overrides, ['devDependencies']);
    return dependencies.filter(([, version]) => !version.startsWith('file:')).map(([name, version]) => new VirtualDependent(name, version));
  }

  getScriptNames(): string[] {
    return [];
  }

  isPublishable(): boolean {
    return false;
  }

  getPackageFile() {
    return this.packageContent;
  }
}
