import Path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BaumManager } from '@veto-party/baum__core';
import { NPMPackageManager } from '@veto-party/baum__package_manager__npm';
import { HelmGenerator } from '../../../src/HelmGenerator.js';
import { HelmGeneratorProvider } from '../../../src/HelmGeneratorProvider.js';
import FileSystem from 'node:fs/promises';
import FileSystemSync from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.join(Path.dirname(__filename), '..');

async function compareDirectories(pathA: string, pathB: string) {
    const filesA = FileSystemSync.readdirSync(pathA);
    const filesB = FileSystemSync.readdirSync(pathB);

    if (filesA.length !== filesB.length) {
        return false;
    }

    for (const file of filesA) {
        if ((await FileSystem.stat(file)).isDirectory()) {
            if (!(await compareDirectories(Path.join(pathA, file), Path.join(pathB, file)))) {
                return false;
            }
        } else {
            const fileA = FileSystemSync.readFileSync(Path.join(pathA, file), 'utf-8');
            const fileB = FileSystemSync.readFileSync(Path.join(pathB, file), 'utf-8');

            if (fileA !== fileB) {
                console.error(`File ${file} is different`);
                return false;
            }
        }
    }
}

describe('A simple test', () => {
    it('Should run successfully', async () => {
        const baum = new BaumManager();

        baum.setRootDirectory(Path.dirname(__filename));
        baum.setPackageManager(new NPMPackageManager());
        baum.dontCopyLockFile();

        const helmfileProvider = new HelmGeneratorProvider(() => 'helm.veto.json', (workspace) => workspace.getPackageFile()['name'].startsWith('@veto/'));
        const helmfileGenerator = new HelmGenerator(helmfileProvider, (workspace) => workspace.getName(), (workspace) => workspace.getName(), '1.0.0');

        baum.addExecutionStep('provide helm metadata', helmfileProvider);
        baum.addExecutionStep('generate helm files', helmfileGenerator);

        await baum.run();

        const testDirectory = Path.join(__dirname, '00-simple');
        const compareResult = await compareDirectories(Path.join(testDirectory, 'helm'), Path.join(testDirectory, 'expected-helm'));

        expect(compareResult).toBe(true);

    });
});
