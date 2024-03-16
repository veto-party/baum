import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import { CachedFN, GenericWorkspace, type IExecutablePackageManager, type IStep, type IWorkspace } from '@veto-party/baum__core';
import semver from 'semver';
import { type SchemaType, schema } from './types/types.js';

type HelmFileResult = [hemlFileMapping: Map<IWorkspace, SchemaType>, workspaceMapping: Map<IWorkspace, IWorkspace[]>];

class HelmGenerator implements IStep {
  /**
   * Returns a mix of attached and detached workspaces.
   *
   * - Attached workspaces are workspaces that are directly present in the workspaces.
   * - detached workspaces are workspaces that are not directly present in the workspace, but are node modules, since we want to check all the packages (by default).
   *
   * // TODO: Filter option for detached workspaces for security. Filtering can be done by overriding getContext(...).
   *
   * @param workspace
   */
  @CachedFN(true)
  private async collectAllWorkspaces(pm: IExecutablePackageManager, root: string): Promise<Map<IWorkspace, IWorkspace[]>> {
    // 1. Check node_modules, if present, use node_modules.
    // 2. Check root node_modules, if present, use root node_modules.

    const internalWorkspaces = await pm.readWorkspace(root);

    const pathToWorkspace: Record<string, IWorkspace> = {};
    const allWorkspaces: Map<IWorkspace, IWorkspace[]> = new Map();

    const workspaces = [...internalWorkspaces];

    do {
      const workspace = workspaces.shift()!;

      const directoriesToCheck = workspace.getDynamicDependents().flatMap((dependent) => [Path.join(workspace.getDirectory(), 'node_modules', dependent.getName()), Path.join(root, 'node_modules', dependent.getName())]);
      const filesToCheck = await Promise.all(
        directoriesToCheck.map((directory) =>
          FileSystem.readFile(Path.join(directory, 'package.json'))
            .then(async (content) => [await FileSystem.realpath(directory), content] as const)
            .catch(() => undefined)
        )
      );
      const resultingContents = filesToCheck.filter(<T>(file: T | undefined): file is T => file !== undefined);

      if (resultingContents.length === 0) {
        continue;
      }

      await Promise.all(
        resultingContents.map(([directory, content]) => {
          const newWorkspace = new GenericWorkspace(directory, JSON.parse(content.toString()), pm.modifyToRealVersionValue.bind(pm));

          let internalWorkspace =
            [...internalWorkspaces, ...Object.values(pathToWorkspace)].find((internalWorkspace) => internalWorkspace.getDirectory() === directory || internalWorkspace.getVersion() === newWorkspace.getVersion() || semver.satisfies(newWorkspace.getVersion(), internalWorkspace.getVersion())) ?? newWorkspace;

          if (pathToWorkspace[internalWorkspace.getDirectory()] === undefined) {
            pathToWorkspace[internalWorkspace.getDirectory()] = internalWorkspace;
          } else {
            internalWorkspace = pathToWorkspace[internalWorkspace.getDirectory()];
          }

          if (!allWorkspaces.has(workspace)) {
            allWorkspaces.set(workspace, [internalWorkspace]);
          } else {
            allWorkspaces.get(workspace)!.push(internalWorkspace);
          }
        })
      );
    } while (workspaces.length > 0);

    return allWorkspaces;
  }

  private getHelmFileName() {
    return 'helm.json';
  }

  @CachedFN(true)
  private async loadFoRWorkspace(workspace: IWorkspace): Promise<SchemaType | undefined> {
    const file = await FileSystem.readFile(Path.join(Path.dirname(workspace.getDirectory()), this.getHelmFileName())).catch(() => undefined);
    if (!file) {
      return;
    }

    const content = JSON.parse(file.toString());
    const valid = schema(content);
    if (!valid) {
      throw new Error('Invalid json schema!');
    }

    return content;
  }

  @CachedFN(true)
  private async collectHelmFiles(pm: IExecutablePackageManager, root: string): Promise<HelmFileResult> {
    const workspaces = await this.collectAllWorkspaces(pm, root);

    const values = await Promise.all(Array.from(workspaces.entries()).map(async ([k, values]) => (await Promise.all(values.map(async (workspace) => [workspace, await this.loadFoRWorkspace(workspace)]))).flat(1)));

    const newMap = new Map<IWorkspace, SchemaType>((values as [IWorkspace, SchemaType][]).values());

    return [newMap, workspaces] as const;
  }

  private async getContext(workspace: IWorkspace, map: HelmFileResult, layer = 1) {
    const [helmFiles, workspaceMapping] = map;

    const scopes = await Promise.all((workspaceMapping.get(workspace) ?? []).map((workspace) => this.getContext(workspace, map, layer + 1)));

    // TODO: Combine bases.
    if (helmFiles.has(workspace)) {
      // TODO: generate new base with bases and helm file. (Also store globals in Context.)
    }
  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    const workspaceMapping = await this.collectHelmFiles(packageManager, rootDirectory);
    await this.getContext(workspace, workspaceMapping);
  }

  clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}

export default HelmGenerator;
