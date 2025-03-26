import { IWorkspace } from "@veto-party/baum__core";
import { IJobRenderer, IJobRendererResult, JobStructure } from "../interface/IJobRenderer.js";
import { ConfigMapping } from "../interface/IConfigMapRenderer.js";
import { SecretMapping } from "../interface/ISecretRenderer.js";
import { ScalingStorage, SystemUsageStorage } from "../interface/IDeploymentRenderer.js";
import { IImageGenerator } from "../interface/IImageGenerator.js";

export class JobRenderer implements IJobRenderer {
    render(
        workspace: IWorkspace | undefined, 
        key: string, 
        job: JobStructure,
        map: Map<string | number, ConfigMapping | SecretMapping>,
        // scaling: ScalingStorage | undefined,
        systemUsage: SystemUsageStorage | undefined,
        imageGenerator: IImageGenerator
    ): IJobRendererResult | Promise<IJobRendererResult> {
        const yaml = (name: string) => ({
            apiVersion: 'batch/v1',
            kind: 'job',
            metadata: {
                name: `${name}-${key}`,
                annotations: {
                    "helm.sh/hook": job.definition?.on ?? 'post-install, post-upgrade',
                }
            },
            spec: {
                template: {
                    restartPolicy: 'OnFailure',
                    containers: [{
                        name: `${name}-${key}-container`,
                        image: job.definition?.image,
                        env: map.entries().map(([name, value]) => ({
                            name,
                            ...('store' in value && value.store
                              ? {
                                  valueFrom: {
                                    [value.type === 'secret' ? 'secretKeyRef' : 'configMapKeyRef']: {
                                      name: value.store,
                                      key: value.key
                                    }
                                  }
                                }
                              : {
                                  value: value.variable
                                })
                          }))
                    }]
                }
            }
        })


        return {
            write: (root, nameProvider) => {

            } 
        }
    }
}