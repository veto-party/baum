
import { IBaumManagerConfiguration, PKGMStep, ParallelStep, PublishStep } from 'baum';
import Path from 'path';
import FileSystem from 'fs/promises';
import { NPMPackageManager } from '@veto-party/baum__package_manager__npm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);


export default (baum: IBaumManagerConfiguration) => {
    baum.setPackageManager(new NPMPackageManager());
    baum.setRootDirectory(__dirname);
    baum.addExecutionStep("prepare", new ParallelStep([
        //new PKGMStep('test'),
        new PKGMStep('build')
    ]));


    const oldFiles: Record<string, any> = {};

    baum.addExecutionStep('package_modification', {
        clean: async () => { },
        execute: async (workspace, pm) => {
            const givenPath = Path.join(workspace.getDirectory(), 'package.json');
            const file = (await FileSystem.readFile(givenPath).toString());

            oldFiles[`${workspace.getName()}-${workspace.getVersion()}`] = file;

            const jsonFile = JSON.parse(file);

            if (jsonFile["scripts"] && jsonFile["scripts"]['build'] === "tsc") {
                if (jsonFile['main'] !== undefined) {
                    jsonFile['main'] = jsonFile['main'].replace('\\./src/', './dist/');
                }
            }

            await FileSystem.writeFile(givenPath, JSON.stringify(jsonFile));
        }
    })

    baum.addExecutionStep('publish', new PublishStep());
}