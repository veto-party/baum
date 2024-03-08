import { CommandStep, IExecutablePackageManager, IStep, IWorkspace, RunOnce } from '@veto-party/baum__core';

import FileSystem from 'fs/promises';
import yaml from 'yaml';

import { fileURLToPath } from "url";
import Path from 'path';

import Crypto from 'crypto';
import { DockerBuildStep } from '@veto-party/baum__steps__docker';



const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

const createHash = (value: string) => {
    return Crypto.createHash('SHA256').update(value).digest('base64').toString();
}

const newConfigPath = (packageName: string, absolute?: boolean) => Path.join(...[absolute ? __dirname : undefined, 'configuration', Crypto.createHash("sha256").update(packageName).digest().toString("base64"), 'config.yaml'].filter((value): value is string => typeof value === "string"));

@RunOnce()
export class PrepareStep extends DockerBuildStep {

    private cwd: string;

    constructor(
        name: string,
        cwd: string
    ) {
        super(`. --tag ${name} --build-arg CONFIG_PATH=${newConfigPath(cwd, false)}`, __dirname);
        this.cwd = cwd;
    }

    async execute(workspace: IWorkspace, pm: IExecutablePackageManager, rootDirectory: string): Promise<void> {
        const packages = await pm.readWorkspace(rootDirectory);

        const prefixes = packages.reduce<string[]>((prev, currentPackage) => {
            const scope = currentPackage.getName().split('/')[0];
            if (!prev.includes(scope) && currentPackage.isPublishable()) {
                prev.push(`${scope}/*`);
            }
            return prev;
        }, []);

        const base = await FileSystem.readFile(Path.join(__dirname, 'configuration', 'base.config.yaml'));
        const config = yaml.parse(base.toString());

        config.storage = '/storage/storage';
        config.plugins = '/storage/plugins';

        config.packages = {};

        prefixes.forEach((prefix) => {
            config.packages[prefix] = {
                "access": "$all",
                "publish": "$all",
                "proxy": "$all",
            }
        });

        const fullPath = newConfigPath(this.cwd, true);
        await FileSystem.mkdir(fullPath, {
            recursive: true
        })
        await FileSystem.writeFile(fullPath, yaml.stringify(config, {
            defaultStringType: 'QUOTE_SINGLE'
        }));

        await super.execute(workspace, pm, rootDirectory);
    }
    async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
        // NO-OP
    }
}