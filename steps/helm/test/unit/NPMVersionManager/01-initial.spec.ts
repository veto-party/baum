import { NPMPackageProvider } from "../../../src/index.js";

describe('unit', () => {
    describe('Should initialize some containers and run some tests', () => {
        it('Should be possible to retrieve and set versions', async () => {
            const provider = new NPMPackageProvider('http://localhost:4873', '@some-versions/metadata');

            expect(await provider.getCurrentVersionFor('test')).toEqual(undefined);
            await provider.updateCurrentVersionFor('test', '0.0.0');
            await provider.flush();
            expect(await provider.getCurrentVersionFor('test')).toEqual('0.0.0');

            expect(await provider.getCurrentVersionFor('test2')).toEqual(undefined);
            await provider.updateCurrentVersionFor('test2', '1.0.1');
            await provider.flush();
            
            expect(await provider.getCurrentVersionFor('test')).toEqual('0.0.0');
            expect(await provider.getCurrentVersionFor('test2')).toEqual('1.0.1');
        });
    });
});