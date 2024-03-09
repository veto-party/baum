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
    const from = typeof this.from === 'function' ? this.from(workspace, packageManager, rootDirectory) : this.from;
    await allSettledButFailure([from].flat().map((source) => this.doExecute(source, workspace)));
  }

  private async doExecute(from: string, workspace: IWorkspace) {

    try {
      const isFile = await FileSystem.stat(from).then((stats) => stats.isFile(), () => false);
      if (isFile) {
        await this.doOrderFiles(workspace, [from]);
      }
    } catch (error) {
      throw new Error(`Source directory ${from} does not exist.`);
    }

    if (from.includes('*')) {
      const files = await globby(from, {
        absolute: true,
        cwd: workspace.getDirectory()
      });

      await this.doOrderFiles(workspace, files);
      return;
    }

    const source = Path.isAbsolute(from) ? from : Path.join(workspace.getDirectory(), from);

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
