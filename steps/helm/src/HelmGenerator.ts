import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import { GroupStep, type IExecutablePackageManager, type IStep, type IWorkspace } from '@veto-party/baum__core';
import yaml from 'yaml';
import { AHelmGeneratorProvider } from './HelmGeneratorProvider.js';
import set from 'lodash.set';
import { buildVariable } from './utility/buildVariable.js';
import { resolveBindings, resolveReference } from './utility/resolveReference.js';

export abstract class HelmGenerator implements IStep {

  constructor(
    private helmFileGeneratorProvider: AHelmGeneratorProvider,
    private dockerFileGenerator: (workspace: IWorkspace) => string,
    private version: string
  ) {}

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    const scopedContext = this.helmFileGeneratorProvider.contexts.get(workspace);
    const globalContext = this.helmFileGeneratorProvider.globalContext;

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

    const valuesYAML: Record<string, any> = {};

    // TODO: resolve bindings.
    Object.entries(resolveBindings(scopedContext?.binding ?? {}, scopedContext?.variable ?? {}, globalContext.variable)).forEach(([k, v]) => {
      const [resolvedKey, resolved] = resolveReference(k, scopedContext!.variable, globalContext.variable) ?? [k, v];

      if (resolved.static) {
        set(valuesYAML, k, buildVariable(resolved, k));
      }
    });

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

    const serviceYAML = [serviceYAMLInternal, serviceYAMLExternal];

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

    const ingressYAML = [ingressYAMLStripPrefixes, ingressYAMLRoutes].flat();

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

                const [key,resolved] = resolveReference(k, scopedContext?.variable ?? {}, globalContext.variable);

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
              })
            }]
          }
        }
      }
    };


    const secretsYAML = {
      apiVersion: 'v1',
      kind: 'secret',
      metadata: {
        name
      },
      type: 'Opaque',
      stringData: Object.fromEntries(Object.entries(resolveBindings(scopedContext?.binding ?? {}, scopedContext?.variable ?? {}, globalContext.variable)).filter(([, value]) => !value.static && value.secret).map(([key]) => {
        return [key, resolveReference(key, scopedContext?.variable ?? {}, globalContext.variable)[1].default!];
      }))
    };



    const configMapYAML = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name
      },
      data: Object.fromEntries(Object.entries(resolveBindings(scopedContext?.binding ?? {}, scopedContext?.variable ?? {}, globalContext.variable)).filter(([, value]) => !value.static && !value.secret).map(([key]) => {
        return [key, resolveReference(key, scopedContext?.variable ?? {}, globalContext.variable)[1].default!];
      }))
    };

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
              image: ''
            }]
          }
        }
      }

    }));
  }

  clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
