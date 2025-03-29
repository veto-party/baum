import { describe, expect, it } from "vitest";

import { GenericWorkspace, IWorkspace } from "@veto-party/baum__core";
import { IWritable } from "../../../../../../../src/implementation/helm/interface/IWritable.js";

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from "node:url";
import { INameProvider } from "../../../../../../../src/interface/INameProvider.js";
import { compareDirectories } from "../../../../../../uility/compareDirectories.js";
import { DeploymentRenderer } from "../../../../../../../src/implementation/helm/implementation/DeploymentRenderer.js";
import { IContainerName } from "../../../../../../../src/implementation/helm/interface/IContainerName.js";
import { IMatchLabel } from "../../../../../../../src/implementation/helm/interface/IMatchLabel.js";
import { IImageGenerator } from "../../../../../../../src/implementation/helm/interface/IImageGenerator.js";


const __dirname = resolve(dirname(fileURLToPath(import.meta.url)));
const actualDir = join(__dirname, 'actual');
const expectedDir = join(__dirname, 'expected');

const chartRenderer = new DeploymentRenderer(new class implements IContainerName {
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

describe('A chart renderer test', () => {

    let writers: IWritable[] = [];

    const workspace = new GenericWorkspace(__dirname, {
        name: 'some-package'
    }, () => false);

    it('Should produce a file (scoped/workspace)', async () => {
        const result = await chartRenderer.render(workspace, new Map(), new Set(), undefined, undefined, undefined, new class implements IImageGenerator {
            generateImage(workspace: IWorkspace): { image: string; } {
                return {
                    image: `${workspace.getName()}-image`
                };
            }
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