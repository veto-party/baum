import Path from 'path';
import { IBaumRegistrable, IExecutablePackageManager, IPackageManager, IStep, IWorkspace } from '@veto-party/baum__core';
import FileSystem from 'fs/promises';
import { ICollection } from '../index.js';
import { IVersionManager } from '../interface/IVersionManager.js';
import { GroupCollection } from './GroupCollection.js';

export abstract class ARegistryStep implements IStep, IBaumRegistrable {
  private collection: ICollection = new GroupCollection([]);

  private oldFiles: Record<string, string> = {};

  constructor(protected VersionManagerClass: (workspaces: IWorkspace[], pm: IPackageManager) => IVersionManager) { }

  addExecutionStep(name: string, step: IStep): this {
    this.collection.addExecutionStep(name, step);
    return this;
  }

  abstract getPublishStep(): IStep | undefined;

  private modifyVersion(version: string, pm: IPackageManager) {
    const resolved = pm.modifyToRealVersionValue(version);
    if (resolved) {
      return resolved;
    }

    return version;
  }

  modifyJSON(file: any, versionManager: IVersionManager) { }

  abstract addInstallStep(): this;

  protected async startExecution(workspace: IWorkspace, pm: IPackageManager, root: string) {
    const givenPath = Path.join(workspace.getDirectory(), 'package.json');
    const file = (await FileSystem.readFile(givenPath)).toString();

    this.oldFiles[`${workspace.getName()}-${workspace.getVersion()}`] = file;

    const jsonFile = JSON.parse(file);

    const manager = this.VersionManagerClass(await pm.readWorkspace(root), pm);

    const keysToModify = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

    keysToModify.forEach((key) => {
      Object.entries((jsonFile[key] ?? {}) as Record<string, string>).forEach(([k, v]) => {
        const resolved = this.modifyVersion(v, pm);
        jsonFile[key][k] = resolved ? manager.getLatestVersionFor(k, resolved) ?? resolved : manager.getLatestVersionFor(k, jsonFile[key][k]) ?? jsonFile[key][k];
      });
    });

    await this.modifyJSON?.(jsonFile, manager);

    await FileSystem.writeFile(givenPath, JSON.stringify(jsonFile));
  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    await this.startExecution(workspace, packageManager, rootDirectory);
    await this.collection.execute(workspace, packageManager, rootDirectory);
    await this.getPublishStep()?.execute(workspace, packageManager, rootDirectory);
    await this.doClean(workspace);
  }

  protected async doClean(workspace: IWorkspace) {
    const givenPath = Path.join(workspace.getDirectory(), 'package.json');
    const oldFile = this.oldFiles[`${workspace.getName()}-${workspace.getVersion()}`];

    if (oldFile) {
      await FileSystem.writeFile(givenPath, oldFile);
    }

    delete this.oldFiles[`${workspace.getName()}-${workspace.getVersion()}`];
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    try {
      await this.doClean(workspace);
    } finally {
      await this.collection.clean(workspace, packageManager, rootDirectory);
      await this.getPublishStep()?.clean(workspace, packageManager, rootDirectory);
    }
  }
}
