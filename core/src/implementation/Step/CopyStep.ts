import Path from 'path';
import FileSystem from 'fs/promises';
import { globby } from 'globby';
import { IStep, IWorkspace } from '../../index.js';
import { IExecutablePackageManager } from '../../interface/PackageManager/IExecutablePackageManager.js';
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
  ) { }

  private filesThatGotCopied = new Map<IWorkspace, Record<string, string[]>>();

  private async doOrderFiles(workspace: IWorkspace, files: string[]) {
    await allSettledButFailure(
      files.map(async (source) => {
        const destination = typeof this.to === 'function' ? this.to(workspace, source) : this.to;

        if (!this.keepFiles) {
          const entry = ensureMapEntry(this.filesThatGotCopied, workspace, {});
          entry[destination] ??= [];

          const fileSources = (await FileSystem.stat(source)).isDirectory() ? await globby(Path.join(source, '**', '*')) : [source];

          if (
            await FileSystem.stat(destination).then(
              (stats) => stats.isDirectory(),
              () => false
            )
          ) {
            entry[destination].push(...fileSources.map((fileSource) => Path.join(destination, fileSource)));
          } else {
            entry[destination].push(destination);
          }
        }

        await FileSystem.cp(source, destination);
      })
    );
  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    if (typeof this.from === 'function') {
      return this.doOrderFiles(workspace, this.from(workspace, packageManager, rootDirectory));
    }

    if (this.from.includes('*')) {
      const files = await globby(this.from, {
        absolute: true,
        cwd: workspace.getDirectory()
      });

      await this.doOrderFiles(workspace, files);
      return;
    }

    const source = Path.join(workspace.getDirectory(), this.from);

    if ((await FileSystem.stat(source)).isDirectory()) {
      await this.doOrderFiles(workspace, await globby(Path.join(source, '**', '*')));

      return;
    }

    await this.doOrderFiles(workspace, [source]);
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    if (!this.keepFiles) {
      await allSettledButFailure(
        Object.entries(ensureMapEntry(this.filesThatGotCopied, workspace, {})).map(async ([, files]) => {
          await allSettledButFailure(files.map((file) => FileSystem.rm(file)));
        })
      );
    }
  }
}
