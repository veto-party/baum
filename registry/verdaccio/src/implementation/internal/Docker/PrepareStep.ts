import { CommandStep, IExecutablePackageManager, IStep, IWorkspace, RunOnce } from '@veto-party/baum__core';

import FileSystem from 'fs/promises';
import yaml from 'yaml';

import { fileURLToPath } from "url";
import Path from 'path';

import Crypto from 'crypto';



const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

const createHash = (value: string) => {
    return Crypto.createHash('SHA256').update(value).digest('base64').toString();
}

const configPath = (packageName: string) => Path.join(__dirname, 'configuration', packageName, 'base.config.yaml');
const newConfigPath = (packageName: string) => Path.join(__dirname, 'configuration', packageName, 'config.yaml');

@RunOnce()
export class PrepareStep extends CommandStep {

    constructor(
        name: string,
        cwd: string
    ) {
        super(`docker build . --tag ${name}`, cwd);
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

        const base = await FileSystem.readFile(configPath(createHash(rootDirectory)));
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

        await FileSystem.writeFile(newConfigPath(createHash(rootDirectory)), yaml.stringify(config, {
            defaultStringType: 'QUOTE_SINGLE'
        }));

        await super.execute(workspace, pm, rootDirectory);
    }
    async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
        // NO-OP
    }
}