import { describe, it } from "vitest";
import { HelmRenderer } from "../../../../../../src/implementation/helm/HelmRenderer.js";
import { ConfigMapRenderer } from "../../../../../../src/implementation/helm/implementation/ConfigMapRenderer.js";
import { SecretRenderer } from "../../../../../../src/implementation/helm/implementation/SecretRenderer.js";
import { DeploymentRenderer } from "../../../../../../src/implementation/helm/implementation/DeploymentRenderer.js";
import { TraefikExposeRenderer } from "../../../../../../src/implementation/helm/implementation/TraefikExposeRenderer.js";
import { NetworkRenderer } from "../../../../../../src/implementation/helm/implementation/NetworkRenderer.js";
import { JobRenderer } from "../../../../../../src/implementation/helm/implementation/JobRenderer.js";
import { ThirdPartyRenderer } from "../../../../../../src/implementation/helm/implementation/ThirdPartyRenderer.js";
import { INameProvider } from "../../../../../../src/interface/INameProvider.js";
import { IPackageManager, IWorkspace } from "@veto-party/baum__core";
import { IConfigMapNameProvider } from "../../../../../../src/implementation/helm/interface/factory/IConfigMapRenderer.js";
import { IContainerName } from "../../../../../../src/implementation/helm/interface/IContainerName.js";
import { IMatchLabel } from "../../../../../../src/implementation/helm/interface/IMatchLabel.js";
import { IDeploymentNameProvider } from "../../../../../../src/implementation/helm/interface/IDeploymentNameProvider.js";
import { IImageGenerator } from "../../../../../../src/implementation/helm/interface/IImageGenerator.js";
import { IVersionProvider } from "../../../../../../src/interface/IVersionProvider.js";

import { NPMPackageManager } from '@veto-party/baum__package_manager__npm';

import { dirname, join } from 'node:path';
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

const getForWorkspace = (pm: IPackageManager, root: string, versionProvider: IVersionProvider) => {

const nameProvider = new (class implements INameProvider, IConfigMapNameProvider, IContainerName, IMatchLabel, IDeploymentNameProvider, IImageGenerator {
    generateImage(workspace: IWorkspace): { image: string; } {
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

return HelmRenderer.makeInstance(
    new ConfigMapRenderer(nameProvider),
    new SecretRenderer(nameProvider),
    new DeploymentRenderer(nameProvider, nameProvider, nameProvider, 'veto-secret'),
    new TraefikExposeRenderer('veto-secret'),
    new NetworkRenderer(nameProvider, nameProvider),
    new JobRenderer(pm, root, 'veto-secret', nameProvider, nameProvider),
    nameProvider,
    nameProvider,
    new ThirdPartyRenderer(),
    versionProvider
);
}


const __dirname = dirname(fileURLToPath(import.meta.url));

describe('A helm renderer test', () => {
    it ('Should render a helm chart', async () => {
        const packageManger = new NPMPackageManager();
        const path = join(__dirname, 'specs', '00-simple');

        const helmRenderer = getForWorkspace(packageManger, path, new class implements IVersionProvider {
            getProjectVersion(): string | Promise<string> {
                return "1.0.1";
            }
            getVersionForWorkspace(workspace: IWorkspace): string | Promise<string> {
                return workspace.getVersion();
            }
        });

        const workspaces = await packageManger.readWorkspace(path);

        const structure = new Map(await Promise.all(workspaces.map(async (workspace) => [workspace, [JSON.parse((await readFile(join(workspace.getDirectory(), 'helm.veto.json'))).toString())]] as const)));

        helmRenderer.render({ packageManger, rootDirectory: path }, structure)
    })
});