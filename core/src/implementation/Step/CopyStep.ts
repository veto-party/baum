import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import { globby } from 'globby';
import type { IStep, IWorkspace } from '../../index.js';
import type { IExecutablePackageManager } from '../../interface/PackageManager/IExecutablePackageManager.js';
import { allSettledButFailure } from '../BaumManager/utility/allSettledButNoFailure.js';

const ensureMapEntry = <T, R>(map: Map<T, R>, key: T, defaultValue: R) => {
  if (!map.has(key)) {
    map.set(key, defaultValue);
  }

  return map.get(key)!;
};

export class CopyStep implements IStep {
  constructor(
    private from: string | ((workspace: IWorkspace, pm: IExecutablePackageManager, rootDirectory: string) => string[]),
    private to: string | ((workspace: IWorkspace, filename: string) => string),
    private keepFiles = true
  ) {}

  private filesThatGotCopied = new Map<IWorkspace, string[]>();

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    const from = typeof this.from === 'function' ? this.from(workspace, packageManager, rootDirectory) : this.from;
    await allSettledButFailure([from].flat().map((source) => this.doExecute(source, workspace)));
  }

  private async doCopy(file: string, workspace: IWorkspace) {
    const entry = ensureMapEntry(this.filesThatGotCopied, workspace, []);

    let to = typeof this.to === 'function' ? this.to(workspace, file) : this.to;
    to = Path.isAbsolute(to) ? to : Path.join(workspace.getDirectory(), to);

    await FileSystem.copyFile(file, to);

    if (!this.keepFiles) {
      entry.push(to);
    }
  }

  private async doExecute(from: string, workspace: IWorkspace) {
    from = Path.isAbsolute(from) ? from : Path.join(workspace.getDirectory(), from);

    const stats = await FileSystem.stat(from);
    if (stats.isFile()) {
      await this.doCopy(from, workspace);
      return;
    }

    if (stats.isDirectory()) {
      const files = await globby(Path.join(from, '**', '*'), {
        absolute: true,
        cwd: workspace.getDirectory(),
        onlyFiles: true
      });

      await allSettledButFailure(files.map((file) => this.doCopy(file, workspace)));
      return;
    }

    throw new Error('Unkown FileSystem.stat response.');
  }

  async clean(workspace: IWorkspace, _packageManager: IExecutablePackageManager, _rootDirectory: string): Promise<void> {
    if (!this.keepFiles) {
      await allSettledButFailure(
        ensureMapEntry(this.filesThatGotCopied, workspace, []).map(async (file) => {
          await FileSystem.rm(file);
        })
      );
    }
  }
}
