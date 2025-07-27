import { readFile } from 'node:fs/promises';
import { CachedFN, type IExecutablePackageManager, type IPackageManager, type IStep, type IWorkspace, Resolver, RunOnce } from '@veto-party/baum__core';
import type { IFeature } from '@veto-party/baum__steps__installer__features';
import type { IRendererManager } from '@veto-party/baum__steps__installer__renderer';
import type { InferStructure } from '@veto-party/baum__steps__installer__renderer/src/interface/IRenderer.js';
import type { ISearchStrategy } from './search/ISearchStrategy.js';
import { VirtualWorkspace } from './VirtualWorkspace.js';

@RunOnce()
export class InstallerRunner<T extends IFeature<any, any, any>, Self> implements IStep {
  constructor(private renderer: IRendererManager<T, Self>) {}

  private searchStrategy: ISearchStrategy | undefined;

  public setSearchStrategy(strategy: ISearchStrategy) {
    this.searchStrategy = strategy;
  }

  async execute(_workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    const metadatas = await this.collectAll(packageManager, rootDirectory);
    this.renderer.render({ packageManager, rootDirectory }, metadatas);
  }

  @CachedFN(true)
  private async collectAll(packageManager: IPackageManager, rootDirectory: string): Promise<Map<IWorkspace, InferStructure<T>>> {
    const workspaces = await packageManager.readWorkspace(rootDirectory);
    const allMaps: Map<IWorkspace, InferStructure<T>>[] = [];
    for (const workspace of workspaces) {
      allMaps.push(await this.collect(workspace));
    }

    const result = new Map<IWorkspace, InferStructure<T>>();

    for (const map of allMaps) {
      map.forEach((value, key) => result.set(key, value));
    }

    return result;
  }

  private async collect(workspace: IWorkspace) {
    if (!this.searchStrategy) {
      throw new Error('No search stragety defined.');
    }

    const files = await this.searchStrategy.search(workspace.getDirectory());
    const absWorkspacePath = Resolver.ensureAbsolute(workspace.getDirectory());

    const map = new Map<IWorkspace, InferStructure<T>>();

    for (const file of files) {
      if (Resolver.ensureAbsolute(file.packagePath) === absWorkspacePath) {
        const fileContent = JSON.parse((await readFile(file.resultPath)).toString());
        this.renderer.getGroup().verifyObject(fileContent);

        map.set(workspace, fileContent);
        continue;
      }

      const [fileContent, packageJSON] = (await Promise.all([readFile(file.resultPath), readFile(file.packagePath)])).map((file) => JSON.parse(file.toString()));
      this.renderer.getGroup().verifyObject(fileContent);

      const { name, version } = packageJSON;

      map.set(this.ensureVirtualWorkspaceCreatedAndSet(name, version, file.packagePath, packageJSON), fileContent);
    }

    return map;
  }

  @CachedFN(false, [true, true, false, false, false]) /** Since content should not change, we ignore it whilist chaching */
  private ensureVirtualWorkspaceCreatedAndSet(packageName: string, packageVersion: string, packagePath: string, packageContent: any): IWorkspace {
    return new VirtualWorkspace(packageName, packageVersion, packagePath, packageContent);
  }

  async clean(_workspace: IWorkspace, _packageManager: IExecutablePackageManager, _rootDirectory: string): Promise<void> {}
}
