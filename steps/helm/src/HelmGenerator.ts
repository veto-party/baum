import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import { EOL } from 'node:os';
import { type IExecutablePackageManager, type IStep, type IWorkspace, CachedFN } from '@veto-party/baum__core';
import { type ExtendedSchemaType, HelmGeneratorProvider } from './HelmGeneratorProvider.js';
import set from 'lodash.set';
import { buildVariable } from './utility/buildVariable.js';
import { resolveBindings, resolveReference } from './utility/resolveReference.js';
import { to_structured_data } from './yaml/to_structure_data.js';
import { ConditionalToken } from './yaml/implementation/ConditionalToken.js';
import { ArrayToken } from './yaml/implementation/ArrayToken.js';
import { ObjectToken } from './yaml/implementation/ObjectToken.js';
import { RawToken } from './yaml/implementation/RawToken.js';

export class HelmGenerator implements IStep {

  constructor(
    private helmFileGeneratorProvider: HelmGeneratorProvider,
    private dockerFileGenerator: (workspace: IWorkspace) => string,
    private dockerFileForJobGenerator: (workspace: IWorkspace, job: string) => string,
    private version: string
  ) {}

  private async writeObjectToFile(root: string, path: string[], obj: any[]) {
    if (obj.length === 0) {
      return;
    }

    const resulting = Path.join(root, ...path);

    try {
      await FileSystem.mkdir(Path.dirname(resulting), {
        recursive: true
      });
    } catch (error) {}

    await FileSystem.writeFile(resulting, obj.map(to_structured_data).map((resolved) => resolved.write()).join(`${EOL}---${EOL}`));
  }

  @CachedFN(true)
  async generateGlobalScope(contexts: Map<IWorkspace, ExtendedSchemaType>, context: ExtendedSchemaType, rootDirectory: string) {
    const ChartYAML = {
      apiVersion: 'v2',
      type: 'application',
      name: 'root',
      version: this.version,
      dependencies: [] as any[]
    };

    Array.from(contexts.entries()).forEach(([workspace, schema]) => {

    const name = Path.relative(rootDirectory, workspace.getDirectory()).replaceAll(Path.sep, '__');
      ChartYAML.dependencies.push({
        name,
        version: this.version,
        repository: `file:${Path.join('..', 'subcharts', workspace.getName())}`
      });
    });

    await this.writeObjectToFile(rootDirectory, ['helm', 'main', 'Chart.yaml'], [ChartYAML]);


    const valuesYAML: Record<string, any> = {};

    const allBindings = Array.from(contexts.values()).map((definition) => Object.entries(resolveBindings(definition.binding ?? {}, definition.variable, context.variable)).map((current) => [resolveReference([current[1], current[0]], definition.variable, context.variable), current] as const)).flat();


    allBindings.forEach(([[resolved],[k, v]]) => {

      // TODO: add flag for external variable reference ( of service )
      if (v.is_global) {
        set(valuesYAML, k, buildVariable(resolved, k));
      }
    });

    if (Object.keys(valuesYAML).length > 0) {
      await this.writeObjectToFile(rootDirectory, ['helm', 'main', 'values.yaml'], [valuesYAML]);
    }


    const secretsYAML = {
      apiVersion: 'v1',
      kind: 'secret',
      metadata: {
        name: 'global'
      },
      type: 'Opaque',
      stringData: Object.fromEntries(allBindings.filter(([,[,value]]) => !value.static && value.secret && value.is_global).map(([[, referencedKey],[key, value]]) => {
        return [key, new RawToken(`{{ ${value.is_global ? '.Global' : ''}.Values.${referencedKey} }}`)];
      }))
    };

    if (Object.keys(secretsYAML.stringData).length > 0) {
      await this.writeObjectToFile(rootDirectory, ['helm', 'main', 'templates', 'secret.yaml'], [secretsYAML]);
    }
    
    const configMapYAML = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: 'global'
      },
      data: Object.fromEntries(allBindings.filter(([,[,value]]) => !value.static && !value.secret && value.is_global).map(([[, referencedKey],[key, value]]) => {
        return [key, new RawToken(`{{ ${value.is_global ? '.Global' : ''}.Values.${referencedKey} }}`)];
      })),
    };

    if (Object.keys(configMapYAML.data).length > 0) {
      await this.writeObjectToFile(rootDirectory, ['helm', 'main', 'templates', 'configMap.yaml'], [configMapYAML]);
    }

  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    const scopedContext = this.helmFileGeneratorProvider.contexts.get(workspace);
    const globalContext = this.helmFileGeneratorProvider.globalContext;

    await this.generateGlobalScope(this.helmFileGeneratorProvider.contexts, this.helmFileGeneratorProvider.globalContext, rootDirectory);

    const name = Path.relative(rootDirectory, workspace.getDirectory()).replaceAll(Path.sep, '__');

    const ChartYAML = {
      apiVersion: 'v2',
      type: 'application',
      name,
      version: this.version,
      dependencies: [] as any[],
    }

    Object.entries(scopedContext?.service ?? {}).forEach(([k ,v]) => {
      ChartYAML.dependencies.push({
        name: v.definition.origin.name,
        version: v.definition.origin.version,
        repository: v.definition.origin.repository,
        alias: k
      });
    });

    await this.writeObjectToFile(rootDirectory, ['helm', 'subcharts', workspace.getName(), 'Chart.yaml'], [ChartYAML]);

    const valuesYAML: Record<string, any> = {};

    Object.entries(resolveBindings(scopedContext?.binding ?? {}, scopedContext?.variable ?? {}, globalContext.variable)).forEach(([k, v]) => {
      const [resolved] = resolveReference([v, k], scopedContext!.variable, globalContext.variable) ?? [k, v];

      // TODO: add flag for external variable reference ( of service )
      if (!resolved.static && !v.is_global) {
        set(valuesYAML, k, buildVariable(resolved, k));
      } 
    });


    await this.writeObjectToFile(rootDirectory, ['helm', 'subcharts', workspace.getName(), 'values.yaml'], [valuesYAML]);

    const serviceYAMLInternal = {
      apiVersion: 'v1',
      kind: 'service',
      metadata: {
        name,
      },
      spec: {
        selector: {
          app: `${name}-depl`
        },
        type: 'ClusterIP',
        ports: Object.entries(scopedContext?.expose ?? {}).filter((([, exposed]) => exposed.type === "internal")).map(([port]) => ({
          name: `${name}-${port}`,
          protocol: 'TCP',
          port,
          targetPort: port
        }))
      }
    };

    const serviceYAMLExternal = {
      apiVersion: 'v1',
      kind: 'service',
      metadata: {
        name,
      },
      spec: {
        selector: {
          app: `${name}-depl`
        },
        type: 'LoadBalancer',
        ports: Object.entries(scopedContext?.expose ?? {}).filter((([, exposed]) => exposed.type === "load-balancer")).map(([port]) => ({
          name: `${name}-${port}`,
          protocol: 'TCP',
          port,
          targetPort: port
        }))
      }
    };

    await this.writeObjectToFile(rootDirectory, ['helm', 'subcharts', workspace.getName(), 'templates', 'service.yaml'], [serviceYAMLInternal.spec.ports.length > 0 ? serviceYAMLInternal : undefined, serviceYAMLExternal.spec.ports.length > 0 ? serviceYAMLExternal : undefined].filter(Boolean));

    const ingressYAMLStripPrefixes = Object.entries(scopedContext?.expose ?? {}).filter(([, exposed]) => exposed.type === "load-balancer").map(([port, lbType]) => ({
      apiVersion: 'traefik.io/v1alpha1',
      kind: 'Middleware',
      metadata: {
        name: `${name}-${port}-strip-prefix`,
      },
      spec: {
        stripPrefix: {
          prefixes: [lbType.path]
        }
      }
    }));

    const ingressYAMLRoutes = {
      apiVersion: 'traefik.containo.us/v1alpha1',
      kind: 'IngressRoute',
      metadata: {
        name: `${name}--veto-ingress`
      },
      spec: {
        entryPoints: [
          'websecure'
        ],
        routes: Object.entries(scopedContext?.expose ?? {}).filter(([port, exposed]) => ({
          kind: 'Rule',
          match: `Host(\`${exposed.domainPrefix}\`) && PathPrefix(\`${exposed.path}\`)`,
          services: [{
            name: `${name}-${port}-exp`,
            port,
            passHostHeader: true
          }],
          middlewares: [{
            name: `${name}-${port}-strip-prefix`
          }]
        }))
      },
    };


    await this.writeObjectToFile(rootDirectory, ['helm', 'subcharts', workspace.getName(), 'templates', 'ingress.yaml'], [ingressYAMLStripPrefixes, Object.keys(ingressYAMLRoutes.spec.routes).length > 0 ? ingressYAMLRoutes : undefined].filter(Boolean).flat());

    const deploymentYAML = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: `${name}-depl`
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: `${name}-depl`
          }
        },
        template: {
          metadata: {
            labels: {
              app: `${name}-depl`
            }
          },
          spec: {
            containers: [{
              name: this.dockerFileGenerator(workspace),
              ports: Object.keys(scopedContext?.expose ?? {}).map((port) => ({
                containerPort: port
              })),
              env: Object.entries(resolveBindings(scopedContext?.binding ?? {}, scopedContext?.variable ?? {}, globalContext.variable)).map(([k ,v]) => {

                const [resolved, key] = resolveReference([v, k], scopedContext?.variable ?? {}, globalContext.variable);

                const resulting: any = {
                  name: key,
                };

                if (resolved.secret) {
                  resulting.valueFrom = {
                    secretKeyRef: {
                      name: v.is_global ? 'global' : name,
                      key
                    }
                  }
                } else if (!resolved.static) {
                  resulting.valueFrom = {
                    configMapKeyRef: {
                      name: v.is_global ? 'global' : name,
                      key
                    }
                  }
                } else {
                  resulting.value = resolved.default;
                }

                return resulting;
              }),
              imagePullSecret: new ConditionalToken(`if eq .Values.global.registry.type "secret"`, new ArrayToken([new ObjectToken({
                name: 'veto-pull-secret'
              })]))
            }]
          }
        }
      }
    };


    await this.writeObjectToFile(rootDirectory, ['helm', 'subcharts', workspace.getName(), 'templates', 'deployment.yaml'], [deploymentYAML].flat());

    const secretsYAML = {
      apiVersion: 'v1',
      kind: 'secret',
      metadata: {
        name
      },
      type: 'Opaque',
      stringData: Object.fromEntries(Object.entries(resolveBindings(scopedContext?.binding ?? {}, scopedContext?.variable ?? {}, globalContext.variable)).filter(([, value]) => !value.static && value.secret && !value.is_global).map(([key, value]) => {
        return [key, new RawToken(`{{ ${value.is_global ? '.Global' : ''}.Values.${resolveReference([value, key], scopedContext?.variable ?? {}, globalContext.variable)[1]} }}`)];
      }))
    };

    if (Object.keys(secretsYAML.stringData).length > 0) {
      await this.writeObjectToFile(rootDirectory, ['helm', 'subcharts', workspace.getName(), 'templates', 'secret.yaml'], [secretsYAML]);
    }
    
    const configMapYAML = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name
      },
      data: Object.fromEntries(Object.entries(resolveBindings(scopedContext?.binding ?? {}, scopedContext?.variable ?? {}, globalContext.variable)).filter(([, value]) => !value.static && !value.secret && !value.is_global).map(([key, value]) => {
        return [key, new RawToken(`{{ ${value.is_global ? '.Global' : ''}.Values.${resolveReference([value, key], scopedContext?.variable ?? {}, globalContext.variable)[1]} }}`)];
      })),
    };

    if (Object.keys(configMapYAML.data).length > 0) {
      await this.writeObjectToFile(rootDirectory, ['helm', 'subcharts', workspace.getName(), 'templates', 'configMap.yaml'], [configMapYAML]);
    }

    const jobYAML = Object.entries(scopedContext?.job ?? {}).map(([key, entry]) => ({
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: {
        name: key,
        "helm.sh/hook-delete-policy": "hook-succeeded"
      },
      spec: {
        template: {
          spec: {
            restartPolicy: 'OnFailure',
            containers: [{
              name: `${key}-container`,
              image: this.dockerFileForJobGenerator(entry.workspace, key),
              env: Object.entries(resolveBindings(entry?.binding ?? {}, scopedContext?.variable ?? {}, globalContext.variable)).map(([k ,v]) => {

                const [resolved, key] = resolveReference([v, k], scopedContext?.variable ?? {}, globalContext.variable);

                const resulting: any = {
                  name: k,
                  value: resolved.default,
                };

                if (resolved.secret) {
                  resulting.valueFrom = {
                    secretKeyRef: {
                      name: k,
                      key
                    }
                  }
                } else {
                  resulting.valueFrom = {
                    configMapKeyRef: {
                      name: k,
                      key
                    }
                  }
                }
              }),
              imagePullSecret: new ConditionalToken(`if eq .Values.global.registry.type "secret"`, new ArrayToken([new ObjectToken({
                name: 'veto-pull-secret'
              })]))
            }]
          }
        }
      }
    }));


    await this.writeObjectToFile(rootDirectory, ['helm', 'subcharts', workspace.getName(), 'templates', 'job.yaml'], [...jobYAML]);
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    // NO-OP
  }
}
