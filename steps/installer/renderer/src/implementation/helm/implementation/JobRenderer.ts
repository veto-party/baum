import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import type { IPackageManager, IWorkspace } from '@veto-party/baum__core';
import type { ConfigMapping } from '../interface/IConfigMapRenderer.js';
import type { IContainerName } from '../interface/IContainerName.js';
import type { SystemUsageStorage } from '../interface/IDeploymentRenderer.js';
import type { IImageGenerator } from '../interface/IImageGenerator.js';
import type { IJobRenderer, IJobRendererResult, JobStructure } from '../interface/IJobRenderer.js';
import type { IMatchLabel } from '../interface/IMatchLabel.js';
import type { SecretMapping } from '../interface/ISecretRenderer.js';
import { ArrayToken } from '../yaml/implementation/ArrayToken.js';
import { ConditionalToken } from '../yaml/implementation/ConditionalToken.js';
import { ObjectToken } from '../yaml/implementation/ObjectToken.js';
import { to_structured_data } from '../yaml/to_structured_data.js';

export class JobRenderer implements IJobRenderer {
  public constructor(
    private packageManager: IPackageManager,
    private root: string,
    private secretName: string,
    private containerNameProvider: IContainerName,
    private labelProvider: IMatchLabel
  ) {}

  private async getPackageImageName(name: string) {
    const workspace = (await this.packageManager.readWorkspace(this.root)).find((workspace) => workspace.getName() === name);

    if (!workspace) {
      throw new Error(`Workspace with name: ${name} not found.`);
    }

    return workspace;
  }

  render(
    workspace: IWorkspace | undefined,
    key: string,
    job: JobStructure,
    map: Map<string | number, ConfigMapping | SecretMapping>,
    // scaling: ScalingStorage | undefined,
    systemUsage: SystemUsageStorage | undefined,
    imageGenerator: IImageGenerator
  ): IJobRendererResult | Promise<IJobRendererResult> {
    const limits = Object.entries(systemUsage?.limit ?? {});
    const requests = Object.entries(systemUsage?.requested ?? {});

    const yaml = async (name: string) => ({
      apiVersion: 'batch/v1',
      kind: 'job',
      metadata: {
        name: `${name}-${key}`,
        annotations: {
          'helm.sh/hook': job.definition?.on ?? 'post-install, post-upgrade'
        }
      },
      spec: {
        template: {
          restartPolicy: 'OnFailure',
          imagePullSecrets: new ConditionalToken(
            `if eq .Values.global.registry.type "secret"`,
            new ArrayToken([
              new ObjectToken({
                name: this.secretName
              })
            ])
          ),
          containers: [
            {
              name: this.containerNameProvider.getForJob(name, key),
              image: 'image' in job.definition ? job.definition.image : imageGenerator.generateImage(await this.getPackageImageName(job.definition.on)),
              resources: {
                limits: limits.length > 0 ? Object.fromEntries(limits) : undefined,
                requests: requests.length > 0 ? Object.fromEntries(requests) : undefined
              },
              nodeSelector: {
                label: this.labelProvider.getForJob(name, key)
              },
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
            }
          ]
        }
      }
    });

    return {
      write: async (root, resolver) => {
        const path = await resolver.getNameByWorkspace(workspace);
        const filepath = Path.join(root, 'helm', path, 'templates');


        await FileSystem.mkdir(filepath, { recursive: true });
        await FileSystem.writeFile(Path.join(filepath, 'deployment.yaml'), to_structured_data(await yaml(path)).write());
      }
    };
  }
}
