import { IDependent, IWorkspace } from '@veto-party/baum__core';
import { PNPMDependent } from './PNPMDependent.js';

export class PNPMWorkspace implements IWorkspace {
  constructor(
    private directory: string,
    private pkgFile: any
  ) {}

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
    return Object.entries(this.pkgFile.dependencies)
      .filter(([, version]) => version === '*')
      .map(([name, version]) => new PNPMDependent(name, version as string));
  }

  getScriptNames(): string[] {
    return this.pkgFile.scripts ? Object.keys(this.pkgFile.scripts) : [];
  }

  isPublishable(): boolean {
    return this.pkgFile.private !== true;
  }
}
