import * as semver from 'semver';
import { shakeWorkspacesIntoExecutionGroups } from '../src/implementation/BaumManager/utility/shakeWorkspacesIntoExecutionGroups.js';
import type { IExecutablePackageManager, IExecutablePackageManagerParser, IPackageManagerExecutor, IWorkspace } from '../src/index.js';
import IDependentMock from './mock/IDependentMock.js';
import IWorkspaceMock from './mock/IWorkspaceMock.js';

import type FileSystem from 'node:fs/promises';

const pm = new (class implements IExecutablePackageManager {
  getExecutor(): IPackageManagerExecutor {
    throw new Error('Method not implemented.');
  }
  getExecutorParser(): IExecutablePackageManagerParser {
    throw new Error('Method not implemented.');
  }
  getCleanLockFile(rootDirectory: string, workspace: IWorkspace): Promise<ReturnType<(typeof FileSystem)['writeFile']>[1]> | undefined {
    throw new Error('Method not implemented.');
  }
  getLockFileName(): string {
    throw new Error('Method not implemented.');
  }
  readWorkspace(rootDirectory: string): Promise<IWorkspace[]> {
    throw new Error('Method not implemented.');
  }
  disableGlobalWorkspace(rootDirectory: string) {
    throw new Error('Method not implemented.');
  }
  enableGlobalWorkspace(rootDirectory: string) {
    throw new Error('Method not implemented.');
  }
  modifyToRealVersionValue(version: string): string | false | undefined {
    return version === '*' ? version : undefined;
  }
})();

describe('Basic tree tests', () => {
  it('Should generate some execution groups', () => {
    const leaf = new IWorkspaceMock('example02', 'v1.1.1', []);
    const node = new IWorkspaceMock('example01', '0.0.0', [leaf.toDepdendent()]);
    expect(shakeWorkspacesIntoExecutionGroups([leaf, node], pm)).toEqual([[leaf], [node]]);
  });

  it('Should generate some more execution groups', () => {
    const leaf = new IWorkspaceMock('example02', '*', []);
    const node = new IWorkspaceMock('example01', '*', [leaf.toDepdendent()]);
    const node3 = new IWorkspaceMock('example03', '*', [node.toDepdendent()]);

    expect(shakeWorkspacesIntoExecutionGroups([leaf, node, node3], pm)).toEqual([[leaf], [node], [node3]]);
  });

  it('Should generate some more complex execution groups', () => {
    const leaf = new IWorkspaceMock('example-leaf', 'v1.1.1', []);
    const nodeA = new IWorkspaceMock('example-node-A', '1.2.3-pre', [leaf.toDepdendent()]);
    const nodeB = new IWorkspaceMock('example-node-B', '3.2.1-beta', [leaf.toDepdendent()]);
    const nodeC = new IWorkspaceMock('example-node-C', '0.0.0', [nodeA.toDepdendent(), nodeB.toDepdendent()]);
    expect(shakeWorkspacesIntoExecutionGroups([leaf, nodeA, nodeB, nodeC], pm)).toEqual([[leaf], [nodeA, nodeB], [nodeC]]);
  });

  describe('Edge cases', () => {
    describe('Circular', () => {
      it('Simple', () => {
        const leaf = new IWorkspaceMock('example02', 'v1.1.1', [new IDependentMock('example02', 'v1.1.1')]);

        try {
          expect(shakeWorkspacesIntoExecutionGroups([leaf], pm));
          expect.fail('Should fail.');
        } catch (error) {
          if (!(error instanceof Error)) {
            throw error;
          }

          expect(error.message).toEqual('Should fail.'); // Improve error message.
        }
      });

      it('Complex', () => {
        const leaf = new IWorkspaceMock('example02', 'v1.1.1', [new IDependentMock('test', 'v0.0.0')]);
        const node = new IWorkspaceMock('test', 'v0.0.0', [leaf]);

        try {
          expect(shakeWorkspacesIntoExecutionGroups([leaf, node], pm));
          expect.fail('Should fail.');
        } catch (error) {
          if (!(error instanceof Error)) {
            throw error;
          }

          expect(error.message).toEqual('Should fail.'); // Improve error message.
        }
      });

      it('Complex chain', () => {
        const leaf = new IWorkspaceMock('example02', 'v1.1.1', [new IDependentMock('test-B', 'v0.0.1')]);
        const nodeA = new IWorkspaceMock('test', 'v0.0.0', [leaf]);
        const nodeB = new IWorkspaceMock('test-B', 'v0.0.1', [nodeA.toDepdendent()]);

        try {
          expect(shakeWorkspacesIntoExecutionGroups([leaf, nodeA, nodeB], pm));
          expect.fail('Should fail.');
        } catch (error) {
          if (!(error instanceof Error)) {
            throw error;
          }

          expect(error.message).toEqual('Should fail.'); // Improve error message.
        }
      });
    });

    it('Should ignore nonexisting dependencies', () => {
      const leaf = new IWorkspaceMock('example02', 'v1.1.1', [new IDependentMock('bla', '0.0.0-nonexistent')]);
      const node = new IWorkspaceMock('example01', '0.0.0', [leaf.toDepdendent()]);
      expect(shakeWorkspacesIntoExecutionGroups([leaf, node], pm)).toEqual([[leaf], [node]]);
    });

    it('Should detect duplicate dependencies', () => {
      const leaf = new IWorkspaceMock('example02', 'v1.1.1', []);

      const leafDuplicate = new IWorkspaceMock('example02', 'v1.1.1', []);
      const node = new IWorkspaceMock('example01', '0.0.0', [leaf.toDepdendent(), leafDuplicate.toDepdendent()]);

      try {
        shakeWorkspacesIntoExecutionGroups([leaf, leafDuplicate, node], pm);
        expect.fail('Should not end up here.');
      } catch (error) {
        if (!(error instanceof Error)) {
          throw error;
        }

        expect(error.message).toEqual('Duplicate package, cannot resolve tree.');
      }
    });

    describe('My version goodness (Very edgy cases)', () => {
      it('Should handle version chains', () => {
        const leaf0 = new IWorkspaceMock('example', '0.0.0', []);
        const leaf1 = new IWorkspaceMock('example', '1.0.0', [leaf0.toDepdendent()]);

        expect(semver.eq('0.0.0', '1.0.0')).toBeFalsy();

        expect(shakeWorkspacesIntoExecutionGroups([leaf0, leaf1], pm)).toEqual([[leaf0], [leaf1]]);
      });
    });

    describe('My version goodness (Very edgy cases)', () => {
      it('Should handle version chains', () => {
        const leaf0 = new IWorkspaceMock('example', '0.0.0', []);
        const leaf1 = new IWorkspaceMock('example', '1.0.0', []);

        expect(semver.eq('0.0.0', '1.0.0')).toBeFalsy();

        const nodeA = new IWorkspaceMock('node01', 'v1.1.1', [leaf0.toDepdendent()]);
        const nodeB = new IWorkspaceMock('node02', 'v1.1.1', [leaf1.toDepdendent()]);

        expect(shakeWorkspacesIntoExecutionGroups([leaf0, leaf1, nodeA, nodeB], pm)).toEqual([
          [leaf0, leaf1],
          [nodeA, nodeB]
        ]);
      });
    });

    describe('With star as version', () => {
      it('Should complete successfully', () => {
        const leaf = new IWorkspaceMock('example02', '*', []);
        const node = new IWorkspaceMock('example01', '*', [leaf.toDepdendent()]);
        expect(shakeWorkspacesIntoExecutionGroups([leaf, node], pm)).toEqual([[leaf], [node]]);
      });
    });
  });
});
