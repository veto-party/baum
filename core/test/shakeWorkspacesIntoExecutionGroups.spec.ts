import { shakeWorkspacesIntoExecutionGroups } from "../src/implementation/BaumManager/utility/shakeWorkspacesIntoExecutionGroups.js";
import { IWorkspace } from "../src/index.js";
import IDependentMock from "./mock/IDependentMock.js";
import IWorkspaceMock from "./mock/IWorkspaceMock.js";

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

    /*
    describe('Edge cases', () => {
        describe('Circular', () => {
            it('Simple', () => {
                // TODO: Change test.
                const leaf = new IWorkspaceMock('example02', 'v1.1.1', [new IDependentMock('example02', 'v1.1.1')]);

                try {
                    expect(shakeWorkspacesIntoExecutionGroups([leaf]));
                    expect.fail("Should fail.");
                } catch (error) {

                }
            });
        });

        it('Should ignore nonexisting dependencies', () => {
            // TODO: Change test.
            const leaf = new IWorkspaceMock('example02', 'v1.1.1', []);
            const node = new IWorkspaceMock('example01', '0.0.0', [leaf.toDepdendent()]);
            expect(shakeWorkspacesIntoExecutionGroups([leaf, node])).toEqual([[leaf], [node]]);
        });

        it('Should detect duplicate dependencies', () => {
            // TOOD: Change test.
            const leaf = new IWorkspaceMock('example02', 'v1.1.1', []);
            const node = new IWorkspaceMock('example01', '0.0.0', [leaf.toDepdendent()]);
            expect(shakeWorkspacesIntoExecutionGroups([leaf, node])).toEqual([[leaf], [node]]);
        });
    });
    */
});
