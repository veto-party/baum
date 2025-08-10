import { NPMPackageProvider } from '../../src/index.js';

describe('unit', () => {
  describe('Should initialize some containers and run some tests', () => {
    it('Should be possible to retrieve and set versions', async () => {
      const provider = new NPMPackageProvider('http://localhost:4873', '@some-versions/metadata');

      const current = await provider.getCurrentVersionFor('test');
      expect(current).toEqual(undefined);
      await provider.updateCurrentVersionFor('test', '0.0.0');
      await provider.flush();
      const updatedVersion = await provider.getCurrentVersionFor('test');
      expect(updatedVersion).toEqual('0.0.0');

      const test2Version = await provider.getCurrentVersionFor('test2');
      expect(test2Version).toEqual(undefined);
      await provider.updateCurrentVersionFor('test2', '1.0.1');
      await provider.flush();

      const notUpdatedVersion = await provider.getCurrentVersionFor('test');
      expect(notUpdatedVersion).toEqual('0.0.0');
      const test2UpdatedVersion = await provider.getCurrentVersionFor('test2');
      expect(test2UpdatedVersion).toEqual('1.0.1');
    });
  });
});