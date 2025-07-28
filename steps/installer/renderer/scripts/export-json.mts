import FileSystem from 'node:fs/promises';
import type { IWorkspace } from '@veto-party/baum__core';
import { NPMPackageManager } from '@veto-party/baum__package_manager__npm';
import {
  ConfigMapRenderer,
  DeploymentRenderer,
  HelmRenderer,
  type IConfigMapNameProvider,
  type IContainerName,
  type IDeploymentNameProvider,
  type IImageGenerator,
  type IMatchLabel,
  type INameProvider,
  type IVersionProvider,
  JobRenderer,
  NetworkRenderer,
  SecretRenderer,
  ThirdPartyRenderer,
  TraefikExposeRenderer
} from '../dist/index.js';

const nameProvider = new (class implements INameProvider, IConfigMapNameProvider, IContainerName, IMatchLabel, IDeploymentNameProvider, IImageGenerator {
  generateImage(workspace: IWorkspace): { image: string } {
    return {
      image: `${this.getNameByWorkspace(workspace)}-image`
    };
  }
  getName(name: string): string {
    return `${name}-depl`;
  }
  getForJob(name: string, key: string): string {
    return `${name}-${key}-label`;
  }
  getForContainer(name: string): string {
    return `${name}-label`;
  }
  getLabelForJob(name: string, key: string): string {
    return `${name}-j-${key}-pod`;
  }
  getLabelForContainer(name: string): string {
    return `${name}-pod`;
  }
  getNameFor(workspace: IWorkspace | undefined, name?: string): string | Promise<string> {
    return [workspace?.getName(), name].filter(Boolean).join('-');
  }
  getNameByWorkspace(workspace: IWorkspace | undefined): string | Promise<string> {
    return workspace === undefined ? 'global' : workspace.getName().replaceAll('/', '__').replaceAll('@', '');
  }
})();

const packageManager = new NPMPackageManager();

const renderer = HelmRenderer.makeInstance(
  new ConfigMapRenderer(nameProvider),
  new SecretRenderer(nameProvider),
  new DeploymentRenderer(nameProvider, nameProvider, nameProvider, 'veto-secret'),
  new TraefikExposeRenderer('veto-secret'),
  new NetworkRenderer(nameProvider, nameProvider),
  new JobRenderer(packageManager, '###invalid###', 'veto-secret', nameProvider, nameProvider),
  nameProvider,
  nameProvider,
  new ThirdPartyRenderer(),
  new (class implements IVersionProvider {
    getProjectVersion(): string | Promise<string> {
      throw new Error('Method not implemented.');
    }
    getVersionForWorkspace(_workspace: IWorkspace): string | Promise<string> {
      throw new Error('Method not implemented.');
    }
  })()
);

const schema = renderer.getGroup().getSchema();

(async () => {
  await FileSystem.writeFile('schema.json', JSON.stringify(schema, null, 2));
})();
