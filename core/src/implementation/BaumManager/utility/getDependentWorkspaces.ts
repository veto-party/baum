import semver from 'semver';
import type { IDependent, IPackageManager, IWorkspace } from '../../../index.js';

export const getDependentWorkspaces = (workspace: IWorkspace, others: IWorkspace[], pm: IPackageManager, getPackagesFor: (workspace: IWorkspace) => IDependent[] = () => workspace.getDynamicDependents()) => {
  const mappedPackages = others.reduce<Record<string, IWorkspace[]>>((previous, aPackage) => {
    previous[aPackage.getName()] ??= [];
    previous[aPackage.getName()].push(aPackage);
    return previous;
  }, {});

  // Sort (mutate) arrays.
  Object.values(mappedPackages).forEach((entries) => entries.sort((a, b) => semver.compare(a.getVersion(), b.getVersion()) || semver.compareBuild(a.getVersion(), b.getVersion())));

  const allDependentsToParse = [...workspace.getDynamicDependents()];
  const checkedDependents: Record<string, IWorkspace> = {};

  const dependentToKey = (dependent: IDependent) => `${dependent.getName()}@${dependent.getVersion()}`;

  while (allDependentsToParse.length > 0) {
    const currentDependent = allDependentsToParse.shift()!;
    if (!mappedPackages[currentDependent.getName()]) {
      continue;
    }

    if (checkedDependents[dependentToKey(currentDependent)]) {
      continue;
    }

    let resolvedVersion = pm.modifyToRealVersionValue(currentDependent.getVersion()) || currentDependent.getVersion();

    if (resolvedVersion === '*') {
      const highestVersion = mappedPackages[currentDependent.getName()][mappedPackages[currentDependent.getName()].length - 1].getVersion();

      if (highestVersion === '*') {
        resolvedVersion = '0.0.0';
      } else {
        const newVersionSplitted = highestVersion.split('.');
        const minorVersion = newVersionSplitted[2].split('-');
        minorVersion[0] = (Number(minorVersion[0]) + 1).toString();
        newVersionSplitted[2] = minorVersion.join('-');
        resolvedVersion = newVersionSplitted.join('.');
      }
    }

    const resolvedPackage = mappedPackages[currentDependent.getName()].findLast((workspace) => {
      const workspaceVersion = pm.modifyToRealVersionValue(workspace.getVersion()) || workspace.getVersion();
      return semver.satisfies(resolvedVersion, workspaceVersion);
    });

    if (!resolvedPackage) {
      continue;
    }

    checkedDependents[dependentToKey(currentDependent)] = resolvedPackage;
    allDependentsToParse.push(...getPackagesFor(resolvedPackage));
  }

  return Object.values(checkedDependents);
};
