import Path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BaumManager } from '@veto-party/baum__core';
import { NPMPackageManager } from '@veto-party/baum__package_manager__npm';
import { HelmGenerator } from '../../../src/HelmGenerator.js';
import { HelmGeneratorProvider } from '../../../src/HelmGeneratorProvider.js';

const __filename = fileURLToPath(import.meta.url);

describe('A simple test', () => {
    it('Should run successfully', async () => {
        const baum = new BaumManager();

        baum.setRootDirectory(Path.dirname(__filename));
        baum.setPackageManager(new NPMPackageManager());

        const helmfileProvider = new HelmGeneratorProvider(() => 'helm.veto.json', (workspace) => workspace.getPackageFile()['name'].startsWith('@veto/'));
        const helmfileGenerator = new HelmGenerator(helmfileProvider, (workspace) => workspace.getName(), (workspace) => workspace.getName(), '1.0.0');

        baum.addExecutionStep('provide helm metadata', helmfileProvider);
        baum.addExecutionStep('generate helm files', helmfileGenerator);

        await baum.run();

        // TODO: check
    });
});
