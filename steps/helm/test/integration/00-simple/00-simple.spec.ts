import { HelmGenerator } from '../../../src/HelmGenerator.js';
import { HelmGeneratorProvider } from '../../../src/HelmGeneratorProvider.js';


describe('A simple test', () => {
    it ('Should run successfully', () => {
        const helmfileProvider = new HelmGeneratorProvider(() => 'veto.helm.json', (workspace) => workspace.getPackageFile()['name'].startsWith('@veto/'));
        const helmfileGenerator = new HelmGenerator(helmfileProvider, (workspace) => workspace.getName(), (workspace) => workspace.getName(), '1.0.0');
    });
});