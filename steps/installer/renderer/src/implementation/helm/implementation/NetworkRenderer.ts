import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import { CachedFN, type IWorkspace } from '@veto-party/baum__core';
import { Graph } from 'graph-data-structure';
import type { INameProvider } from '../../../interface/INameProvider.js';
import { HelmRenderer } from '../HelmRenderer.js';
import type { IContainerName } from '../interface/IContainerName.js';
import type { IMatchLabel } from '../interface/IMatchLabel.js';
import type { INetworkRenderer, INetworkRendererResult, NetworkStorage } from '../interface/INetworkRenderer.js';
import { to_structured_data } from '../yaml/to_structured_data.js';

type NodeType = { workspace: IWorkspace; job?: string } | { workspace?: undefined; job: string };
type EdgeType = NodeType;

export class NetworkRenderer implements INetworkRenderer {
  public constructor(
    private containerNameProvider: IContainerName,
    private labelSelector: IMatchLabel
  ) {}

  private workspaceToProjectMap = new Map<
    IWorkspace | undefined,
    {
      service?: NetworkStorage;
      jobs?: Record<string, NetworkStorage>;
    }
  >();

  private workspaceByName = new Map<string, NodeType>();

  private async yamlForWorkspace(workspace: IWorkspace, name: string, provider: INameProvider, graph: Graph<NodeType, EdgeType>) {
    const key = this.ensureKey(workspace);
    const connectedWorkspaces = graph.adjacent(key);

    const yaml: any = {
      kind: 'NetworkPolicy',
      apiVersion: 'networking.k8s.io/v1',
      metadata: {
        name: `${this.containerNameProvider.getForContainer(name)}-net`
      },
      spec: {
        podSelector: {
          matchLabel: this.labelSelector.getForContainer(name)
        },
        ingress: [],
        egress: []
      }
    };

    for (const workspace of connectedWorkspaces ?? []) {
      const connections = [graph.getEdgeProperties(workspace, key), graph.getEdgeProperties(key, workspace)];
      const ingress = connections.includes(key);
      const egress = connections.includes(workspace);

      const selector = {
        podSelector: {
          matchLabels: {
            label: workspace.job ? this.labelSelector.getForJob(await provider.getNameByWorkspace(workspace.workspace), workspace.job) : provider.getNameByWorkspace(workspace.workspace)
          }
        }
      };

      if (ingress) {
        yaml.ingress.push({
          from: [selector]
        });
      }

      if (egress) {
        yaml.egress.push({
          to: [{ selector }]
        });
      }
    }

    return yaml;
  }

  private async yamlForJob(workspace: IWorkspace | undefined, jobKey: string, name: string, provider: INameProvider, graph: Graph<NodeType, EdgeType>) {
    const key = this.ensureKey(workspace, jobKey);
    const connectedWorkspaces = graph.adjacent(key);

    const yaml: any = {
      kind: 'NetworkPolicy',
      apiVersion: 'networking.k8s.io/v1',
      metadata: {
        name: `${this.containerNameProvider.getForJob(name, jobKey)}-net`
      },
      spec: {
        podSelector: {
          matchLabel: this.labelSelector.getForContainer(name)
        },
        ingress: [],
        egress: []
      }
    };

    for (const workspace of connectedWorkspaces ?? []) {
      const connections = [graph.getEdgeProperties(workspace, key), graph.getEdgeProperties(key, workspace)];
      const ingress = connections.includes(key);
      const egress = connections.includes(workspace);

      const selector = {
        podSelector: {
          matchLabels: {
            label: workspace.job ? this.labelSelector.getForJob(await provider.getNameByWorkspace(workspace.workspace), workspace.job) : provider.getNameByWorkspace(workspace.workspace)
          }
        }
      };

      if (ingress) {
        yaml.ingress.push({
          from: [selector]
        });
      }

      if (egress) {
        yaml.egress.push({
          to: [{ selector }]
        });
      }
    }

    return yaml;
  }

  @CachedFN(false)
  private ensureKey(workspace: IWorkspace | undefined, job?: string) {
    return { workspace, job } as NodeType;
  }

  @CachedFN(false)
  getWritable(): INetworkRendererResult {
    return {
      write: async (root, resolver) => {
        const graph = new Graph<NodeType, EdgeType>();

        for (const [workspace, { jobs }] of this.workspaceToProjectMap.entries()) {
          if (workspace) {
            const ensured = this.ensureKey(workspace, undefined);
            this.workspaceByName.set(await resolver.getNameByWorkspace(workspace)!, ensured);
            graph.addNode(ensured);
          }

          for (const job of Object.keys(jobs ?? {})) {
            const ensured = this.ensureKey(workspace, job);
            this.workspaceByName.set(`${await resolver.getNameByWorkspace(workspace)}.${job}`, ensured);
            graph.addNode(ensured);
          }
        }

        for (const [workspace, { service, jobs }] of this.workspaceToProjectMap.entries()) {
          if (workspace) {
            const ensured = this.ensureKey(workspace, undefined);
            service?.allow_connections_to?.forEach((connection) => {
              const ensured_to = this.workspaceByName.get(connection.to);
              if (!ensured_to) {
                throw new Error('Network not found.');
              }
              graph.addEdge(ensured, ensured_to, { props: ensured_to });
            });
          }

          for (const [name, value] of Object.entries(jobs ?? {})) {
            const ensured = this.ensureKey(workspace, name);
            value.allow_connections_to?.forEach((connection) => {
              const ensured_to = this.workspaceByName.get(connection.to);
              if (!ensured_to) {
                throw new Error('Network not found.');
              }

              graph.addEdge(ensured, ensured_to, { props: ensured_to });
            });
          }
        }

        for (const node of graph.nodes) {
          if (!graph.edges.has(node)) {
            // Render none network.
            continue;
          }

          let yaml;

          if (node.job) {
            yaml = this.yamlForJob.bind(this, node.workspace, node.job);
          } else {
            yaml = this.yamlForWorkspace.bind(this, node.workspace!);
          }

          const path = await resolver.getNameByWorkspace(node.workspace);
          const filepath = Path.join(root, 'helm', path, 'templates');
          await FileSystem.writeFile(Path.join(filepath, `${[node.job ? 'job' : undefined, node.job, 'network'].filter(Boolean).join('-')}.yaml`), to_structured_data(await yaml(path, resolver, graph)).write());
        }
      }
    };
  }

  render(workspace: IWorkspace | undefined, key: string | undefined, network: NetworkStorage): INetworkRendererResult | Promise<INetworkRendererResult> {
    const entry = HelmRenderer.ensurePropertyValueGenerator(this.workspaceToProjectMap, () => ({}))(workspace);

    if (key !== undefined) {
      entry.jobs ??= {};
      entry.jobs[key] = network;
    } else {
      entry.service = network;
    }

    return this.getWritable();
  }
}
