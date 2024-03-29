import FileSystem from 'node:fs/promises';
import { CachedFN, type IExecutablePackageManager, type IStep, type IWorkspace } from "@veto-party/baum__core"
import type { HelmGeneratorProvider } from "./HelmGeneratorProvider.js";

export class HelmDefinitionUpdator implements IStep {

    constructor(
        private provider: HelmGeneratorProvider
    ) {}

    @CachedFN(true)
    private async readVersion() {
        const packageJsonPath = await import.meta.resolve('@veto-party/baum__steps__helm/package.json');
        const json = await FileSystem.readFile(packageJsonPath);
        return JSON.parse(json.toString()).version ?? '0.0.0'; // 0.0.0 for baum development.
    }

    async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
        const definition = this.provider.contexts.get(workspace);
        if (!definition) {
            return;
        }

        const version = await this.readVersion();

        const current = `https://baum.veto.dev/schema/steps/helm/${version}/schema.json`;

        if (definition.$schema === current) {
            return;
        }

        const file = JSON.parse((await FileSystem.readFile(this.provider.getHelmDefinitionForWorkspace(workspace))).toString());
        file.$schema = current;
        await FileSystem.writeFile(this.provider.getHelmDefinitionForWorkspace(workspace), JSON.stringify(file));
    }
    
    async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
        throw new Error("Method not implemented.");
    }

}