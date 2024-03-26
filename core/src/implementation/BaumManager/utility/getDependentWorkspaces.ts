import semver from 'semver';
import type { IDependent, IPackageManager, IWorkspace } from '../../../index.js';

export const getDependentWorkspaces = (workspace: IWorkspace, others: IWorkspace[], pm: IPackageManager, getPackagesFor: (workspace: IWorkspace) => IDependent[] = () => workspace.getDynamicDependents()) => {
  const mappedPackages = others.reduce<Record<string, IWorkspace[]>>((previous, aPackage) => {
    previous[aPackage.getName()] ??= [];
    previous[aPackage.getName()].push(aPackage);
    return previous;
  }, {});

  // Sort (mutate) arrays.
  Object.values(mappedPackages).forEach((entries) =>
    entries.sort((a, b) => {
      const resolvedA = pm.modifyToRealVersionValue(a.getVersion()) || a.getVersion();
      const resolvedB = pm.modifyToRealVersionValue(b.getVersion()) || b.getVersion();

      if (resolvedA === '*' && resolvedB === '*') {
        return 0;
      }

      if (resolvedA === '*') {
        return 1;
      }

      if (resolvedB === '*') {
        return -1;
      }

      return semver.compare(a.getVersion(), b.getVersion()) || semver.compareBuild(a.getVersion(), b.getVersion());
    })
  );

  const resolveToVersion = (name: string, version: string) => {
    if (version === '*') {
      const highestVersion = (mappedPackages[name].findLast((workspace) => workspace.getVersion() !== '*') ?? mappedPackages[name][mappedPackages[name].length - 1]).getVersion();

      if (highestVersion === '*') {
        return '0.0.0';
      }

      const newVersionSplitted = highestVersion.split('.');
      const minorVersion = newVersionSplitted[2].split('-');
      minorVersion[0] = (Number(minorVersion[0]) + 1).toString();
      newVersionSplitted[2] = minorVersion.join('-');
      return newVersionSplitted.join('.');
    }

    return version;
  };

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

    const unResolvedVersion = pm.modifyToRealVersionValue(currentDependent.getVersion()) || currentDependent.getVersion();
    const resolvedVersion = resolveToVersion(currentDependent.getName(), unResolvedVersion);

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
