import * as semver from 'semver';
import type { IExecutablePackageManager } from '../../../index.js';
import type { IDependent, IWorkspace } from '../../../interface/PackageManager/IPackageManager.js';

export const shakeWorkspacesIntoExecutionGroups = (workspaces: IWorkspace[], pm: IExecutablePackageManager): IWorkspace[][] => {
  let nodes: [name: string, version: string, workspace: IWorkspace, deps: [version: string, dependent: IDependent][], index: number][] = [];

  const dependencyMapping = workspaces.reduce<Record<string, [string, IWorkspace][]>>((previous, workspace) => {
    previous[workspace.getName()] ??= [];

    // TODO: improve sorting
    const found = previous[workspace.getName()].find(([version]) => workspace.getVersion() === version || semver.eq(workspace.getVersion(), version));
    if (found !== undefined) {
      console.log("ehhhh");
      throw new Error('Duplicate package, cannot resolve tree.', {
        cause: new Error(`Its package ${workspace.getName()}:${workspace.getVersion()} at path (${workspace.getDirectory()}) and (${found[1].getDirectory()})`)
      });
    }


    console.log("????");

    const index = previous[workspace.getName()].push([workspace.getVersion(), workspace]);
    nodes.push([
      workspace.getName(),
      workspace.getVersion(),
      workspace,
      workspace
        .getDynamicDependents()
        .filter((depdent) => workspaces.some((workspace) => workspace.getName() === depdent.getName()))
        .map((dependent) => {
          const resolvedVersion = pm.modifyToRealVersionValue(dependent.getVersion());
          return [resolvedVersion || dependent.getVersion(), dependent];
        }),
      index
    ]);
    return previous;
  }, {});

  // Sort (mutate) arrays.
  Object.values(dependencyMapping).forEach((entries) => entries.sort(([a], [b]) => semver.compare(a, b) || semver.compareBuild(a, b)));

  const withoutDependencies = workspaces.filter((workspace) => {
    return !workspace.getDynamicDependents().some((dependent) => {
      if (!dependencyMapping[dependent.getName()]) {
        return false;
      }

      const realVersion = pm.modifyToRealVersionValue(dependent.getVersion()) || dependent.getVersion();

      if (realVersion === '*') {
        return true;
      }

      try {
        return dependencyMapping[dependent.getName()].some(([version]) => {
          try {
            return semver.satisfies(realVersion, version) || semver.eq(realVersion, version);
          } catch (error) {
            return semver.satisfies(version, realVersion) || realVersion === version;
          }
        });
      } catch (error) {
        throw new Error(`Could not resolve version for: "${dependent.getName()}:${dependent.getVersion()}"`, {
          cause: error
        });
      }
    });
  });

  const dependenciesToCheck: [string, IWorkspace, number][] = withoutDependencies.map((workspace) => [workspace.getVersion(), workspace, 0]);

  nodes = nodes.filter(([, , workspace]) => !withoutDependencies.includes(workspace));

  const workspaceGroups: IWorkspace[][] = [[]];

  while (dependenciesToCheck.length > 0) {
    const [sem, dependency, givenDepth] = dependenciesToCheck.shift()!;

    if (givenDepth > workspaceGroups.length - 1) {
      workspaceGroups.push([]);
    }

    workspaceGroups[givenDepth].push(dependency);

    if (!sem) {
      throw new Error('internal error!');
    }

    nodes = nodes
      .map((entry) => {
        const [name, version, workspace, deps, index] = entry;
        // TODO: check if it is latest version that satisfies.

        const newDeps = deps.filter(([ver, dependent]) => {
          if (dependent.getName() !== dependency.getName()) {
            return true;
          }

          const arr = dependencyMapping[dependent.getName()] ?? [];
          return semver.satisfies(ver, dependency.getVersion()) && !(index > arr.length - 2 || semver.satisfies(ver, arr[index + 1][1].getVersion()));
        });

        if (newDeps.length === 0) {
          dependenciesToCheck.push([version, workspace, workspaceGroups.length]);
        }

        return [name, version, workspace, newDeps, index] as (typeof nodes)[number];
      })
      .filter((node) => node[3].length !== 0);
  }

  return workspaceGroups;
};
