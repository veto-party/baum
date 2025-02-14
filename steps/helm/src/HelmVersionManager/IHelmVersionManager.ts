import type { IPackageManager, IWorkspace } from '@veto-party/baum__core';

export interface IHelmVersionManager {
  /**
   * this function gets the current version for a helm chart
   *
   * virtual workspaces are generated packages that are not part of the actual workspace
   * virtual workspaces are used to combine multiple helm charts into a parent helm chart
   *
   * @param name
   * @param workspace workspace or undefined when virtual workspace given
   * @param pm package manager
   * @param root
   */
  getCurrentVersionFor(name: string, workspace: IWorkspace | undefined, pm: IPackageManager, root: string): string | undefined | Promise<string | undefined>;
}
