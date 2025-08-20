import semver from 'semver';
import type { IDependent, IPackageManager, IWorkspace } from '../../../index.js';

const dependentToKey = (name: string, version: string) => `${name}@${version}`;

export const getDependentWorkspaces = (workspace: IWorkspace, others: IWorkspace[], pm: IPackageManager, getPackagesFor: (workspace: IWorkspace) => IDependent[] = () => workspace.getDynamicDependents()) => {
  const mappedPackages = others.reduce<Record<string, IWorkspace[]>>((previous, aPackage) => {
    const name = aPackage.getVersion().startsWith('node:') ? aPackage.getVersion().substring('node:'.length, aPackage.getVersion().indexOf('@')) : aPackage.getName();

    previous[name] ??= [];
    previous[name].push(aPackage);
    return previous;
  }, {});

  // Sort (mutate) arrays.
  Object.values(mappedPackages).forEach((entries) => {
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
    });
  });

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

  while (allDependentsToParse.length > 0) {
    const currentDependent = allDependentsToParse.shift()!;

    const name = currentDependent.getVersion().startsWith('node:') ? currentDependent.getVersion().substring('node:'.length, currentDependent.getVersion().indexOf('@')) : currentDependent.getName();
    const version = currentDependent.getVersion().startsWith('node:') ? currentDependent.getVersion().substring(currentDependent.getVersion().indexOf('@')) : currentDependent.getVersion();

    if (!mappedPackages[name]) {
      continue;
    }

    if (checkedDependents[dependentToKey(name, version)]) {
      continue;
    }

    const unResolvedVersion = pm.modifyToRealVersionValue(version) || version;
    const resolvedVersion = resolveToVersion(name, unResolvedVersion);

    const resolvedPackage = (mappedPackages[name] ?? []).findLast((workspace) => {
      const workspaceVersion = pm.modifyToRealVersionValue(workspace.getVersion()) || workspace.getVersion();
      return semver.satisfies(resolvedVersion, workspaceVersion);
    });

    if (!resolvedPackage) {
      continue;
    }

    checkedDependents[dependentToKey(name, version)] = resolvedPackage;
    allDependentsToParse.push(...getPackagesFor(resolvedPackage));
  }

  return Object.values(checkedDependents);
};
