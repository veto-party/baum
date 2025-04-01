import { describe, expect, it } from "vitest";

import { GenericWorkspace, IPackageManager, IWorkspace } from "@veto-party/baum__core";
import { IWritable } from "../../../../../../../src/implementation/helm/interface/IWritable.js";

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from "node:url";
import { INameProvider } from "../../../../../../../src/interface/INameProvider.js";
import { compareDirectories } from "../../../../../../uility/compareDirectories.js";
import { IMatchLabel } from "../../../../../../../src/implementation/helm/interface/IMatchLabel.js";
import { IContainerName } from "../../../../../../../src/implementation/helm/interface/IContainerName.js";
import { NetworkRenderer } from "../../../../../../../src/implementation/helm/implementation/NetworkRenderer.js";


const __dirname = resolve(dirname(fileURLToPath(import.meta.url)));
const actualDir = join(__dirname, 'actual');
const expectedDir = join(__dirname, 'expected');

const chartRenderer = new NetworkRenderer(new class implements IContainerName {
    getForContainer(name: string): string {
        return `${name}-pod`;
    }

    getForJob(name: string, key: string): string {
        return `${name}-j-${key}-pod`;
    }
}, new class implements IMatchLabel {
    getForContainer(name: string): string {
        return `${name}-matcher`;
    }

    getForJob(name: string, key: string): string {
        return `${name}-j-${key}-matcher`;
    }
});

describe('A network renderer test', () => {

    let writers: IWritable[] = [];

    const workspace = new GenericWorkspace(__dirname, {
        name: 'some-package'
    }, () => false);

    it('Should produce a file (global)', async () => {
        const result = await chartRenderer.render(undefined, "some-job", {
            allow_connections_to: [{
                to: 'some-package',
                policy: {
                    type: 'SIMPLE'
                }
            }]
        });

        writers.push(result);
    });


    it('Should produce a file (scoped/workspace)', async () => {
        const result = await chartRenderer.render(workspace, undefined, {
            allow_connections_to: []
        });

        writers.push(result);
    });



    it('Should produce a file (scoped/workspace + key)', async () => {
        const result = await chartRenderer.render(workspace, "some-job", {
            allow_connections_to: [{
                to: 'some-package',
                policy: {
                    type: 'SIMPLE'
                }
            }]
        });

        writers.push(result);
    });

    it ('Should write them to the file system and they should match the contents.', async () => {
        await Promise.all(writers.map((writer) => writer.write(actualDir, new class implements INameProvider {
            getNameByWorkspace(workspace: IWorkspace | undefined): string | Promise<string> {
                if (!workspace) {
                    return 'main';
                }

                return workspace.getName();
            }
        })));

        expect(await compareDirectories(actualDir, expectedDir)).toBeTruthy();
    })
});