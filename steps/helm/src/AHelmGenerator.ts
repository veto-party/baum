import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import { CachedFN, GenericWorkspace, type IExecutablePackageManager, type IStep, type IWorkspace } from '@veto-party/baum__core';
import semver from 'semver';
import { type SchemaType, schema } from './types/types.js';
import cloneDeep from 'lodash.clonedeep';
import isEqual from 'lodash.isequal';

type HelmFileResult = [hemlFileMapping: Map<IWorkspace, SchemaType>, workspaceMapping: Map<IWorkspace, IWorkspace[]>];

type ExtendedSchemaType = {
  binding?: SchemaType['binding'];
  connection?: SchemaType['connection'];
  expose?: SchemaType['expose'];
  job?: SchemaType['job'];
  service?: SchemaType['service'];
  variable: Record<string, Exclude<SchemaType['variable'], undefined>[string] | { ref: string; }>;
  __scope?: Record<string, Exclude<SchemaType['variable'], undefined>[string] | { ref: string; }>; 
}

export abstract class AHelmGenerator implements IStep {

  private getHash(value: string) {
    let hash = 7;
    for (let i = 0; i < value.length; i++) {
      hash = hash * 31 + value.charCodeAt(i);
    }

    const hexHash = hash.toString(16);
    return hexHash.substring(0, Math.min(6, hexHash.length - 1));
  }

  /**
   * Returns a mix of attached and detached workspaces.
   *
   * - Attached workspaces are workspaces that are directly present in the workspaces.
   * - detached workspaces are workspaces that are not directly present in the workspace, but are node modules, since we want to check all the packages (by default).
   *
   * // TODO: Filter option for detached workspaces for security. Filtering can be done by overriding getContext(...).
   *
   * @param workspace
   */
  @CachedFN(true)
  private async collectAllWorkspaces(pm: IExecutablePackageManager, root: string): Promise<Map<IWorkspace, IWorkspace[]>> {
    // 1. Check node_modules, if present, use node_modules.
    // 2. Check root node_modules, if present, use root node_modules.

    const internalWorkspaces = await pm.readWorkspace(root);

    const pathToWorkspace: Record<string, IWorkspace> = {};
    const allWorkspaces: Map<IWorkspace, IWorkspace[]> = new Map();

    const workspaces = [...internalWorkspaces];

    do {
      const workspace = workspaces.shift()!;

      const directoriesToCheck = workspace.getDynamicDependents().flatMap((dependent) => [Path.join(workspace.getDirectory(), 'node_modules', dependent.getName()), Path.join(root, 'node_modules', dependent.getName())]);
      const filesToCheck = await Promise.all(
        directoriesToCheck.map((directory) =>
          FileSystem.readFile(Path.join(directory, 'package.json'))
            .then(async (content) => [await FileSystem.realpath(directory), content] as const)
            .catch(() => undefined)
        )
      );
      const resultingContents = filesToCheck.filter(<T>(file: T | undefined): file is T => file !== undefined);

      if (resultingContents.length === 0) {
        continue;
      }

      await Promise.all(
        resultingContents.map(([directory, content]) => {
          const newWorkspace = new GenericWorkspace(directory, JSON.parse(content.toString()), pm.modifyToRealVersionValue.bind(pm));

          let internalWorkspace =
            [...internalWorkspaces, ...Object.values(pathToWorkspace)].find((internalWorkspace) => internalWorkspace.getDirectory() === directory || internalWorkspace.getVersion() === newWorkspace.getVersion() || semver.satisfies(newWorkspace.getVersion(), internalWorkspace.getVersion())) ?? newWorkspace;

          if (pathToWorkspace[internalWorkspace.getDirectory()] === undefined) {
            pathToWorkspace[internalWorkspace.getDirectory()] = internalWorkspace;
          } else {
            internalWorkspace = pathToWorkspace[internalWorkspace.getDirectory()];
          }

          if (!allWorkspaces.has(workspace)) {
            allWorkspaces.set(workspace, [internalWorkspace]);
          } else {
            allWorkspaces.get(workspace)!.push(internalWorkspace);
          }
        })
      );
    } while (workspaces.length > 0);

    return allWorkspaces;
  }

  abstract getHelmFileName(): string;

  @CachedFN(true)
  private async loadFoRWorkspace(workspace: IWorkspace): Promise<SchemaType | undefined> {
    const file = await FileSystem.readFile(Path.join(Path.dirname(workspace.getDirectory()), this.getHelmFileName())).catch(() => undefined);
    if (!file) {
      return;
    }

    const content = JSON.parse(file.toString());
    const valid = schema(content);
    if (!valid) {
      throw new Error('Invalid json schema!');
    }

    return content;
  }

  @CachedFN(true)
  private async collectHelmFiles(pm: IExecutablePackageManager, root: string): Promise<HelmFileResult> {
    const workspaces = await this.collectAllWorkspaces(pm, root);

    const values = await Promise.all(Array.from(workspaces.entries()).map(async ([k, values]) => (await Promise.all(values.map(async (workspace) => [workspace, await this.loadFoRWorkspace(workspace)]))).flat(1)));

    const newMap = new Map<IWorkspace, SchemaType>((values as [IWorkspace, SchemaType][]).values());

    return [newMap, workspaces] as const;
  }

  private groupScopes(schema: ExtendedSchemaType[], defaultValue: ExtendedSchemaType): ExtendedSchemaType {
    return [...schema, defaultValue].reduce<ExtendedSchemaType>((previous, current) => {

      if (current.binding) {
        previous.binding ??= current.binding;
        if (previous.binding !== current.binding) {
          Object.entries(current.binding).forEach(([key, value]) => {
            if (previous.binding![key] && previous.binding![key] === value) {
              console.warn(`binding ${JSON.stringify(key)} got overridden.`);
            }
            previous.binding![key] = value;
          });
        }
      }

      if (current.connection) {
        previous.connection ??= current.connection;
        if (previous.connection !== current.connection) {
          previous.connection.forEach((entry) => {
            if (previous.connection?.some(({ target }) => target === entry.target)) {
              console.warn(`duplicate ${JSON.stringify(entry.target)}, ignoring.`);
            } else {
              previous.connection?.push(entry);
            }
          });
        }
      }

      if (current.expose) {
        previous.expose ??= current.expose;
        if (previous.expose !== current.expose) {
          Object.entries(current.expose).forEach(([key, value]) => {
            if (previous.expose![key] && isEqual(previous.expose![key], value)) {
              return;
            }

            if (!previous.expose![key]) {
              console.log(`expose ${JSON.stringify(key)} got overriden.`);
            }

            previous.expose![key] = value;
          });
        }
      }

      if (current.job) {
        previous.job ??= current.job;
        if (previous.job !== current.job) {
          Object.entries(current.job).forEach(([key, value]) => {
            if (previous.job![key] && isEqual(previous.job![key], value)) {
              return;
            }

            if (!previous.job![key]) {
              console.log(`job ${JSON.stringify(key)} got overridden.`);
            }

            previous.job![key] = value;
          });
        }
      }

      if (current.service) {
        previous.service ??= current.service;
        if (previous.service !== current.service) {
          Object.entries(current.service).forEach(([key, value]) => {
            if (previous.service![key] && isEqual(previous.service![key], value)) {
              return;
            }

            if (!previous.service![key]) {
              console.log(`service ${JSON.stringify(key)} got overridden.`);
            }

            previous.service![key] = value;
          });
        }
      }

      if (current.variable) {
        previous.variable ??= current.variable;
        if (previous.variable !== current.variable) {
          Object.entries(current.variable).forEach(([key, value]) => {
            if (previous.variable![key] && isEqual(previous.variable![key], value)) {
              return;
            }

            if (!previous.variable![key]) {
              console.log(`service ${JSON.stringify(key)} got overridden.`);
            }

            previous.variable![key] = value;
          });
        }
      }

      return previous;
    }, {
      variable: {}
    });
  }

  private async getContext(workspace: IWorkspace, map: HelmFileResult, layer = 1) {
    const [helmFiles, workspaceMapping] = map;

    const childScopes = (await Promise.all((workspaceMapping.get(workspace) ?? []).map((workspace) => this.getContext(workspace, map, layer + 1)))).filter(<T>(value: T|undefined): value is T  => value !== undefined);

    // TODO: Combine bases.
    if (helmFiles.has(workspace)) {
      const helmFile = helmFiles.get(workspace);

      const defaultValue = {
        ...helmFile,
        variable: helmFile?.variable ?? {}
      }

      const environment: Record<'global'|'scoped', ExtendedSchemaType> = {
        global: this.groupScopes(childScopes.map((scope) => scope.global), defaultValue),
        scoped: this.groupScopes(childScopes.map((scope) => scope.global), defaultValue),
      };

      environment.scoped.binding = helmFile?.binding;
      environment.scoped.connection = helmFile?.connection;
      environment.scoped.job = helmFile?.job;

      Object.entries(helmFile?.service ?? {}).forEach(([definitionName, service]) => {
        let realDefinitionName: string|undefined = undefined;
        if (service.type === "scoped") {
          realDefinitionName = `k${this.getHash(workspace.getName())}-${definitionName}`;
        }

        Object.entries(service.environment ?? {}).forEach(([k, v]) => {
          let cloned: Exclude<typeof environment[keyof typeof environment]['variable'], undefined>[string] = cloneDeep({
            ...v,
            type: v.type ?? service.type,
            external: true
          });

          let refTarget = environment.global.variable;

          if (realDefinitionName) {
            refTarget = environment.scoped.variable;
            refTarget[`${realDefinitionName}.${k}`] == cloneDeep(cloned);
            cloned = {
              ref: `${realDefinitionName}.${k}`
            }
          }

          const refString = `${definitionName}.${k}`;
          environment.scoped.__scope ??= {};
          environment.scoped.__scope[`${definitionName}.environment.${k}`] = {
            ref: refString,
          };
          refTarget[refString] = cloned;
        });

        let scopedDefinitionName = realDefinitionName ?? definitionName;

        if (service.type !== "global") {
          scopedDefinitionName = `k${this.getHash(workspace.getName())}-${realDefinitionName ?? definitionName}`;
        }

        const scopedKey = `${realDefinitionName ?? definitionName}.${service.origin_name_var}`;
        environment.global.variable[scopedKey] = {
          type: service.type,
          default: scopedDefinitionName
        };
        
        if (realDefinitionName) {
          environment.scoped.__scope ??= {};
          environment.scoped.__scope[`${definitionName}..${service.origin_name_var}`] = {
            ref: scopedKey,
          };
        }

        environment.scoped.__scope ??= {};
        const scopedEnvironmentKey = `${realDefinitionName ?? definitionName}.origin_name_var`;
        environment.scoped.__scope[scopedEnvironmentKey] = {
          ref: scopedKey
        };

        if (realDefinitionName) {
          const scopedEnvironmentKeyRef = `${definitionName}.origin_name_var`;
          environment.scoped.__scope[scopedEnvironmentKeyRef] = {
            ref: scopedEnvironmentKey
          }
        }

        environment.scoped.service ??= {};
        environment.scoped.service[realDefinitionName ?? definitionName] = service;
      });

      return environment;
    }

    return undefined;
  }

  abstract getDockerImageForWorkspace(workspace: IWorkspace): string;

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    const workspaceMapping = await this.collectHelmFiles(packageManager, rootDirectory);
    const context = await this.getContext(workspace, workspaceMapping);

    if (!context) {
      return;
    }


  }

  clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
