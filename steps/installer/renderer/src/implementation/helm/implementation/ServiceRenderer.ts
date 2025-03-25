import { IWorkspace } from "@veto-party/baum__core";
import { ConfigMapping } from "../interface/IConfigMapRenderer.js";
import { SecretMapping } from "../interface/ISecretRenderer.js";
import { IServiceRenderer, IServiceRendererResult } from "../interface/IServiceRenderer.js";
import { ExposeStructure } from "../interface/IExposeRenderer.js";
import { to_structured_data } from "../yaml/to_structured_data.js";
import Path from 'node:path';
import FileSystem from 'node:fs/promises';

export class ServiceRenderer implements IServiceRenderer {
    render(workspace: IWorkspace, ports: Map<string | number, ExposeStructure> | undefined): IServiceRendererResult | Promise<IServiceRendererResult> {

        if (ports === undefined || ports.size === 0) {
            return {
                write: () => {

                }
            }
        }

        const yaml = (name: string) => ({
            apiVersion: 'v1',
            kind: 'Service',
            metadata: {
                name: `${name}-service`
            },
            spec: {
                selector: {
                    name: `${name}-depl`
                },
                type: 'ClusterIP',
                ports: ports.entries()
                    .map(([port]) => ({
                        name: `${name}-${port}`,
                        protocol: 'TCP',
                        port: Number(port),
                        targetPort: Number(port)
                    }))
            }
        });

        return {
            write: async (root, resolver) => {
                const path = await resolver.getNameByWorkspace(workspace);
                const filepath = Path.join(
                    root, 
                    'helm', 
                    path, 
                    'templates'
                );

                await FileSystem.writeFile(Path.join(filepath, 'service.yaml'), to_structured_data(yaml(path)).write());
            }
        }
    }

}