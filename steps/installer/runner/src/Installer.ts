import { readFile } from 'node:fs/promises';
import { CachedFN, RunOnce, type IExecutablePackageManager, type IStep, type IWorkspace } from '@veto-party/baum__core';
import type { IFeature } from '@veto-party/baum__steps__installer__features';
import type { IRendererManager } from '@veto-party/baum__steps__installer__renderer';
import type { ISearchStrategy } from './search/ISearchStrategy.js';
import type { InferStructure } from '@veto-party/baum__steps__installer__renderer/src/interface/IRenderer.js';
import { isAbsolute, join, resolve } from 'node:path';
import { VirtualWorkspace } from './VirtualWorkspace.js';

@RunOnce()
export class InstallerRunner<T extends IFeature<any, any, any>, Self> implements IStep {
  constructor(private renderer: IRendererManager<T, Self>) {}

  private searchStrategy: ISearchStrategy | undefined;
  private metadatas: Map<IWorkspace, InferStructure<T>> = new Map();

  public setSearchStrategy(strategy: ISearchStrategy) {
    this.searchStrategy = strategy;
  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    const workspaces = await packageManager.readWorkspace(rootDirectory);
    for (const workspace of workspaces) {
      await this.collect(workspace);
    }

    this.renderer.render({ packageManager, rootDirectory}, this.metadatas);
  }

  private static ensureAbsolute(path: string) {
    return isAbsolute(path) ? path : resolve(path);
  }

  public async collect(workspace: IWorkspace) {
    if (!this.searchStrategy) {
      throw new Error('No search stragety defined.');
    }

    const files = await this.searchStrategy.search(workspace.getDirectory());
    const absWorkspacePath = InstallerRunner.ensureAbsolute(workspace.getDirectory());

    for (const file of files) {

      if (InstallerRunner.ensureAbsolute(file.packagePath) === absWorkspacePath) {
        const fileContent = JSON.parse((await readFile(file.resultPath)).toString());
        this.renderer.getGroup().verifyObject(fileContent);

        this.metadatas.set(workspace, fileContent);
        
        continue;
      }

      const [fileContent, packageJSON] = (await Promise.all([readFile(file.resultPath), readFile(file.packagePath)])).map((file => JSON.parse(file.toString())));
      this.renderer.getGroup().verifyObject(fileContent);

      const { name, version } = packageJSON;

      await this.ensureVirtualWorkspaceCreatedAndSet(name, version, file.packagePath, packageJSON, fileContent);
    }
  }

  @CachedFN(true, [true, true, false, false, false]) /** Since content should not change, we ignore it whilist chaching */
  private async ensureVirtualWorkspaceCreatedAndSet(packageName: string, packageVersion: string, packagePath: string, packageContent: any, content: InferStructure<T>): Promise<void> {
    const workspace = new VirtualWorkspace(packageName, packageVersion, packagePath, packageContent);
    this.metadatas.set(workspace, content);
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {}
}
