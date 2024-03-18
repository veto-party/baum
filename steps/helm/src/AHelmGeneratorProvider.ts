import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import { CachedFN, GenericWorkspace, type IExecutablePackageManager, type IStep, type IWorkspace } from '@veto-party/baum__core';
import semver from 'semver';
import { type SchemaType, schema } from './types/types.js';
import cloneDeep from 'lodash.clonedeep';
import isEqual from 'lodash.isequal';
import yaml from 'yaml';

type HelmFileResult = [hemlFileMapping: Map<IWorkspace, SchemaType>, workspaceMapping: Map<IWorkspace, IWorkspace[]>];

type ExtendedSchemaType = {
  binding?: SchemaType['binding'];
  connection?: SchemaType['connection'];
  expose?: SchemaType['expose'];
  job?: SchemaType['job'];
  service?: SchemaType['service'];
  variable: Record<string, Partial<Exclude<SchemaType['variable'], undefined>[string]> & { ref?: string; }>;
  __scope?: Record<string, Partial<Exclude<SchemaType['variable'], undefined>[string]> & { ref?: string; }>; 
}

type Mappers = { [K in Exclude<keyof ExtendedSchemaType, undefined>]: (prev: ExtendedSchemaType[K], current: ExtendedSchemaType[K]) => ExtendedSchemaType[K]; }

export abstract class AHelmGeneratorProvider implements IStep {


  protected globalContexts: ExtendedSchemaType[] = [];
  public contexts: Map<IWorkspace, ExtendedSchemaType> = new Map();


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

      if (!this.workspaceFilter(workspace)) {
        continue;
      }

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

  abstract workspaceFilter(workspace: IWorkspace): boolean;

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

  private static basicOverrideFnc(definitionKey: string) {
    return <T extends Record<string, any>|undefined>(prev: T, current: T): T => {
      if (!prev) {
        return cloneDeep(current);
      }

      const resulting = cloneDeep(prev);
      Object.entries(prev).forEach(([key, value]) => {
        if (prev[key] && isEqual(prev[key], value)) {
          return;
        }

        if (prev[key]) {
          console.warn(`${JSON.stringify(definitionKey)} got overridden ${JSON.stringify(key)}`)
        }

        (resulting as any)[key] = value;
      });

      return resulting;
    }
  }

  private grouperFunctions: Mappers = {
    variable: AHelmGeneratorProvider.basicOverrideFnc('variable'),
    expose: AHelmGeneratorProvider.basicOverrideFnc('expose'),
    job: AHelmGeneratorProvider.basicOverrideFnc('job'),
    service: AHelmGeneratorProvider.basicOverrideFnc('service'),
    binding: AHelmGeneratorProvider.basicOverrideFnc('binding'),
    __scope: AHelmGeneratorProvider.basicOverrideFnc('#__internal__(__scope)'),
    connection: (prev, current) => {
      if (!prev) {
        return cloneDeep(current);
      }

      const result = cloneDeep(prev);
      current?.forEach(({ target }) => {
        if (result.some((lookup) => lookup.target === target)) {
          console.warn(`connection(${JSON.stringify(target)}) is duplicated.`);
          return;
        }

        result.push({ target });
      });

      return result;
    }
  }

  private groupScopes(schema: ExtendedSchemaType[]): ExtendedSchemaType {
    return [...schema].reduce<ExtendedSchemaType>((previous, current) => {
      Object.entries(current).forEach(([key, value]) => {
        (previous as any)[key] = (this.grouperFunctions as any)[key]((previous as any)?.[key], value);
      });
      return previous;
    }, {
      variable: {}
    });
  }

  private async getContext(workspace: IWorkspace, map: HelmFileResult, layer = 1): Promise<Record<'global' | 'scoped', ExtendedSchemaType>|undefined> {
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
        global: this.groupScopes([...childScopes.map((scope) => scope.global), defaultValue]),
        scoped: this.groupScopes([...childScopes.map((scope) => scope.global), defaultValue]),
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

      if (helmFile?.variable) {
        Object.entries(helmFile.variable).map(([k, valueValue]) => {
          if (valueValue.type.startsWith("global")) {
            environment.global.variable[k] = valueValue;
          } else {
            environment.scoped.variable[k] = valueValue;
          }
        });
      }

      return environment;
    }

    if (childScopes.some((scope) => scope)) {
      const result =  {
        global: this.groupScopes(childScopes.map((childScope) => childScope.global)),
        scoped: this.groupScopes(childScopes.map((childScopes) => childScopes.scoped))
      }
      return result;
    }
    
    return undefined;
  }

  abstract getDockerImageForWorkspace(workspace: IWorkspace): string;

  public get globalContext() {
    return this.groupScopes(this.globalContexts);
  } 

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    const workspaceMapping = await this.collectHelmFiles(packageManager, rootDirectory);
    const context = await this.getContext(workspace, workspaceMapping);

    if (!context) {
      return;
    }

    this.globalContexts.push(context.global);
    this.contexts.set(workspace, context.scoped);
  }

  clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
