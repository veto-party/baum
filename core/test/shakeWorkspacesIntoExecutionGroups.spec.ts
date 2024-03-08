import * as semver from 'semver';
import { shakeWorkspacesIntoExecutionGroups } from '../src/implementation/BaumManager/utility/shakeWorkspacesIntoExecutionGroups.js';
import IDependentMock from './mock/IDependentMock.js';
import IWorkspaceMock from './mock/IWorkspaceMock.js';

describe('Basic tree tests', () => {
  it('Should generate some execution groups', () => {
    const leaf = new IWorkspaceMock('example02', 'v1.1.1', []);
    const node = new IWorkspaceMock('example01', '0.0.0', [leaf.toDepdendent()]);
    expect(shakeWorkspacesIntoExecutionGroups([leaf, node])).toEqual([[leaf], [node]]);
  });
  it('Should generate some more complex execution groups', () => {
    const leaf = new IWorkspaceMock('example-leaf', 'v1.1.1', []);
    const nodeA = new IWorkspaceMock('example-node-A', '1.2.3-pre', [leaf.toDepdendent()]);
    const nodeB = new IWorkspaceMock('example-node-B', '3.2.1-beta', [leaf.toDepdendent()]);
    const nodeC = new IWorkspaceMock('example-node-C', '0.0.0', [nodeA.toDepdendent(), nodeB.toDepdendent()]);
    expect(shakeWorkspacesIntoExecutionGroups([leaf, nodeA, nodeB, nodeC])).toEqual([[leaf], [nodeA, nodeB], [nodeC]]);
  });

  describe('Edge cases', () => {
    describe('Circular', () => {
      it('Simple', () => {
        const leaf = new IWorkspaceMock('example02', 'v1.1.1', [new IDependentMock('example02', 'v1.1.1')]);

        try {
          expect(shakeWorkspacesIntoExecutionGroups([leaf]));
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
          expect(shakeWorkspacesIntoExecutionGroups([leaf, node]));
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
          expect(shakeWorkspacesIntoExecutionGroups([leaf, nodeA, nodeB]));
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
      expect(shakeWorkspacesIntoExecutionGroups([leaf, node])).toEqual([[leaf], [node]]);
    });

    it('Should detect duplicate dependencies', () => {
      const leaf = new IWorkspaceMock('example02', 'v1.1.1', []);

      const leafDuplicate = new IWorkspaceMock('example02', 'v1.1.1', []);
      const node = new IWorkspaceMock('example01', '0.0.0', [leaf.toDepdendent(), leafDuplicate.toDepdendent()]);

      try {
        shakeWorkspacesIntoExecutionGroups([leaf, leafDuplicate, node]);
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

        expect(shakeWorkspacesIntoExecutionGroups([leaf0, leaf1])).toEqual([[leaf0], [leaf1]]);
      });
    });

    describe('My version goodness (Very edgy cases)', () => {
      it('Should handle version chains', () => {
        const leaf0 = new IWorkspaceMock('example', '0.0.0', []);
        const leaf1 = new IWorkspaceMock('example', '1.0.0', []);

        expect(semver.eq('0.0.0', '1.0.0')).toBeFalsy();

        const nodeA = new IWorkspaceMock('node01', 'v1.1.1', [leaf0.toDepdendent()]);
        const nodeB = new IWorkspaceMock('node02', 'v1.1.1', [leaf1.toDepdendent()]);

        expect(shakeWorkspacesIntoExecutionGroups([leaf0, leaf1, nodeA, nodeB])).toEqual([
          [leaf0, leaf1],
          [nodeA, nodeB]
        ]);
      });
    });

    describe('With star as version', () => {
      it('Should complete successfully', () => {
        const leaf = new IWorkspaceMock('example02', '*', []);
        const node = new IWorkspaceMock('example01', '*', [leaf.toDepdendent()]);
        expect(shakeWorkspacesIntoExecutionGroups([leaf, node])).toEqual([[leaf], [node]]);
      });
    });
  });
});
