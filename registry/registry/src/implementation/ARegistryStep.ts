import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import type { IBaumRegistrable, IExecutablePackageManager, IPackageManager, IStep, IWorkspace } from '@veto-party/baum__core';
import type { ICollection } from '../index.js';
import type { IVersionManager } from '../interface/IVersionManager.js';
import { GroupCollection } from './GroupCollection.js';

export abstract class ARegistryStep implements IStep, IBaumRegistrable {
  private collection: ICollection = new GroupCollection([]);

  private oldFiles: Record<string, string> = {};

  constructor(protected VersionManagerClass: (workspaces: IWorkspace[], pm: IPackageManager) => IVersionManager) {}

  addExecutionStep(name: string, step: IStep): this {
    this.collection.addExecutionStep(name, step);
    return this;
  }

  abstract getPublishStep(workspace: IWorkspace): IStep | undefined;

  private modifyVersion(version: string, pm: IPackageManager) {
    const resolved = pm.modifyToRealVersionValue(version);
    if (resolved) {
      return resolved;
    }

    return version;
  }

  async modifyJSON(file: any, versionManager: IVersionManager, workspace: IWorkspace, pm: IPackageManager, root: string) {
    // NO-OP (This is for overloading)
  }

  abstract addInstallStep(): this;

  abstract getInstallStep(workspace: IWorkspace): Promise<IStep | undefined>;

  protected async startExecution(workspace: IWorkspace, pm: IPackageManager, root: string): Promise<boolean> {
    const givenPath = Path.join(workspace.getDirectory(), 'package.json');
    const file = (await FileSystem.readFile(givenPath)).toString();

    this.oldFiles[`${workspace.getName()}-${workspace.getVersion()}`] = file;

    const jsonFile = JSON.parse(file);

    const manager = this.VersionManagerClass(await pm.readWorkspace(root), pm);

    const keysToModify = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

    const allWorkspaces = await pm.readWorkspace(root);

    keysToModify.forEach((key) => {
      Object.entries((jsonFile[key] ?? {}) as Record<string, string>).forEach(([k, v]) => {
        if (!allWorkspaces.some((w) => w.getName() === k)) {
          return;
        }
        const resolved = this.modifyVersion(v, pm);
        jsonFile[key][k] = manager.getLatestVersionFor(k, resolved) ?? resolved;
      });
    });

    await this.modifyJSON?.(jsonFile, manager, workspace, pm, root);

    await FileSystem.writeFile(givenPath, JSON.stringify(jsonFile));
    return true;
  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    if ((await this.startExecution(workspace, packageManager, rootDirectory)) !== false) {
      await (await this.getInstallStep(workspace))?.execute(workspace, packageManager, rootDirectory);
      await this.collection.execute(workspace, packageManager, rootDirectory);
      await this.getPublishStep(workspace)?.execute(workspace, packageManager, rootDirectory);
      await this.doClean(workspace);
    }
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
      await this.getPublishStep(workspace)?.clean(workspace, packageManager, rootDirectory);
      await this.collection.clean(workspace, packageManager, rootDirectory);
      await (await this.getInstallStep(workspace))?.clean(workspace, packageManager, rootDirectory);
    }
  }
}
