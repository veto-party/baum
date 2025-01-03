import OldFileSystem from 'node:fs';
import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import { CachedFN, GenericWorkspace, type IExecutablePackageManager, type IStep, type IWorkspace, RunOnce, getDependentWorkspaces } from '@veto-party/baum__core';
import cloneDeep from 'lodash.clonedeep';
import isEqual from 'lodash.isequal';
import { type SchemaType, schema } from './types/types.js';
import { getHash } from './utility/buildVariable.js';

type HelmFileResult = [hemlFileMapping: Map<IWorkspace, SchemaType>, workspaceMapping: Map<IWorkspace, IWorkspace[]>];

export type ExtendedSchemaType = {
  binding?: SchemaType['binding'];
  connection?: SchemaType['connection'];
  expose?: SchemaType['expose'];
  job?: Record<
    string,
    Omit<Exclude<SchemaType['job'], undefined>[string], 'variable'> & {
      workspace: IWorkspace;
      variable: Record<string, Partial<Exclude<SchemaType['variable'], undefined>[string]> & ({ ref: string; sourcePath?: undefined } | { ref?: undefined; sourcePath: string }) & { external?: boolean }>;
      __scope?: Record<string, Partial<Exclude<SchemaType['variable'], undefined>[string]> & ({ ref: string; sourcePath?: undefined } | { ref?: undefined; sourcePath: string })>;
    }
  >;
  service?: Record<
    string,
    | (Exclude<SchemaType['service'], undefined | null>[string] & {
        is_local: false;
      })
    | {
        is_local: true;
        workspace: IWorkspace;
      }
  >;
  variable: Record<string, Partial<Exclude<SchemaType['variable'], undefined>[string]> & ({ ref: string } | { ref?: undefined; sourcePath: string }) & { external?: boolean }>;
  is_service?: boolean;
  alias: string;
  __scope?: Record<string, Partial<Exclude<SchemaType['variable'], undefined>[string]> & ({ ref: string } | { ref?: undefined; sourcePath: string })>;
  update_strategy?: SchemaType['update_strategy'];
  system_usage?: SchemaType['system_usage'];
  scaling?: SchemaType['scaling'];
  $schema?: string;
};

type Mappers = { [K in Exclude<keyof ExtendedSchemaType, undefined>]: (prev: ExtendedSchemaType[K], current: ExtendedSchemaType[K], workspace: IWorkspace) => ExtendedSchemaType[K] };

/**
 * @internal
 */
@RunOnce()
export class HelmGeneratorProvider implements IStep {
  public globalContext: ExtendedSchemaType = {
    variable: {},
    alias: 'global',
    is_service: false
  };

  public contexts: Map<IWorkspace, ExtendedSchemaType> = new Map();

  constructor(
    private getHelmFileName: (workspace: IWorkspace) => string,
    private workspaceFilter: (workspace: IWorkspace) => boolean,
    private workspaceAliasGenerator: (workspace: IWorkspace, rootDirectory: string) => string = (workspace, rootDirectory) => Path.relative(rootDirectory, workspace.getDirectory()).replaceAll(Path.sep, '__')
  ) {}

  public getHelmDefinitionForWorkspace(workspace: IWorkspace) {
    const basePath = this.getHelmFileName(workspace);

    if (Path.isAbsolute(basePath)) {
      return basePath;
    }

    return Path.join(workspace.getDirectory(), basePath);
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

    const internalWorkspaces = [...(await pm.readWorkspace(root))];

    const checkedDirectories: Record<string, true | undefined> = {};
    let workspaces = [...internalWorkspaces];

    while (workspaces.length > 0) {
      const workspace = workspaces.shift()!;

      if (!this.workspaceFilter(workspace)) {
        continue;
      }

      const directoriesToCheck = workspace.getDynamicDependents().flatMap((dependent) => {
        if (internalWorkspaces.some((workpace) => workpace.getName() === dependent.getName() && pm.modifyToRealVersionValue(dependent.getVersion()) === '*')) {
          return [];
        }

        if (!dependent.getVersion().startsWith('node:')) {
          return [Path.join(workspace.getDirectory(), 'node_modules', dependent.getName()), Path.join(root, 'node_modules', dependent.getName())];
        }

        return [Path.join(workspace.getDirectory(), 'node_modules', dependent.getVersion().substring('node:'.length)), Path.join(root, 'node_modules', dependent.getVersion().substring('node:'.length))];
      });
      const filesToCheck = await Promise.all(
        directoriesToCheck.map((directory) =>
          FileSystem.readFile(Path.join(directory, 'package.json'))
            .then(async (content) => [await FileSystem.realpath(directory), content] as const)
            .catch(() => undefined)
        )
      );
      const resultingContents = filesToCheck.filter(<T>(file: T | undefined): file is T => file !== undefined);

      if (resultingContents.length !== 0) {
        await Promise.all(
          resultingContents.map(([directory, content]) => {
            if (checkedDirectories[directory] || internalWorkspaces.some((workspace) => OldFileSystem.realpathSync(workspace.getDirectory()) === OldFileSystem.realpathSync(directory))) {
              checkedDirectories[directory] = true;
              return;
            }

            checkedDirectories[directory] = true;

            const newWorkspace = new GenericWorkspace(directory, JSON.parse(content.toString()), pm.modifyToRealVersionValue.bind(pm));

            if (!this.workspaceFilter(newWorkspace)) {
              return;
            }

            internalWorkspaces.push(newWorkspace);
            workspaces.push(newWorkspace);
          })
        );
      }
    }

    workspaces = [...internalWorkspaces];

    const allWorkspaces: Map<IWorkspace, IWorkspace[]> = new Map();

    while (workspaces.length > 0) {
      const workspace = workspaces.pop()!;

      allWorkspaces.set(workspace, getDependentWorkspaces(workspace, internalWorkspaces, pm));
    }

    return allWorkspaces;
  }

  @CachedFN(true)
  private async loadFoRWorkspace(workspace: IWorkspace): Promise<SchemaType | undefined> {
    const file = await FileSystem.readFile(this.getHelmDefinitionForWorkspace(workspace)).catch(() => undefined);
    if (!file) {
      return;
    }

    const content = JSON.parse(file.toString());
    const valid = schema(content);
    if (!valid) {
      console.log(schema.errors);
      throw new Error('Invalid json schema!');
    }

    return content;
  }

  @CachedFN(true)
  private async collectHelmFiles(pm: IExecutablePackageManager, root: string): Promise<HelmFileResult> {
    const workspaces = await this.collectAllWorkspaces(pm, root);

    const values: [IWorkspace, SchemaType][] = [];

    await Promise.all(
      Array.from(workspaces.keys())
        .flat()
        .map(async (workspace) => {
          const helmFile = await this.loadFoRWorkspace(workspace);

          if (!helmFile) {
            return;
          }
          values.push([workspace, helmFile]);
        })
    );

    const newMap = new Map<IWorkspace, SchemaType>(values);

    return [newMap, workspaces] as const;
  }

  private static basicOverrideFnc(definitionKey: string) {
    return <T extends Record<string, any> | undefined>(prev: T, current: T): T => {
      if (!prev) {
        return cloneDeep(current);
      }

      if (!current) {
        return cloneDeep(prev);
      }

      const resulting = cloneDeep(prev);
      Object.entries(current).forEach(([key, value]) => {
        if (prev[key] && isEqual(prev[key], value)) {
          return;
        }

        if (prev[key]) {
          console.warn(`${JSON.stringify(definitionKey)} got overridden ${JSON.stringify(key)}`);
        }

        (resulting as any)[key] = value;
      });

      return resulting;
    };
  }

  private grouperFunctions: Mappers = {
    system_usage: HelmGeneratorProvider.basicOverrideFnc('system_usage'),
    update_strategy: HelmGeneratorProvider.basicOverrideFnc('update_strategy'),
    variable: HelmGeneratorProvider.basicOverrideFnc('variable'),
    expose: HelmGeneratorProvider.basicOverrideFnc('expose'),
    job: HelmGeneratorProvider.basicOverrideFnc('job'),
    service: HelmGeneratorProvider.basicOverrideFnc('service'),
    binding: HelmGeneratorProvider.basicOverrideFnc('binding'),
    __scope: HelmGeneratorProvider.basicOverrideFnc('#__internal__(__scope)'),
    scaling: HelmGeneratorProvider.basicOverrideFnc('scaling'),
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
    },
    is_service: (_, current) => current,
    alias: (_, current) => current,
    $schema: (_, current) => current
  };

  public groupScopes(schema: ExtendedSchemaType[], workspace: IWorkspace): ExtendedSchemaType {
    return [...schema].reduce<ExtendedSchemaType>(
      (previous, current) => {
        Object.entries(current).forEach(([key, value]) => {
          if ((this.grouperFunctions as any)[key]) {
            (previous as any)[key] = (this.grouperFunctions as any)[key]((previous as any)?.[key], value, workspace);
          } else {
            console.log(`${key} was not found...`);
          }
        });
        return previous;
      },
      {
        variable: {},
        is_service: false,
        alias: ''
      }
    );
  }

  public getAlias(workspace: IWorkspace, root: string) {
    return this.workspaceAliasGenerator(workspace, root);
  }

  private async getContext(workspace: IWorkspace, map: HelmFileResult, root: string, checkingDependencies: IWorkspace[] = []): Promise<Record<'global' | 'scoped', ExtendedSchemaType> | undefined> {
    const [helmFiles, workspaceMapping] = map;

    const hash = getHash(workspace.getName() + checkingDependencies.map((dep) => dep.getName()));

    const dependenciesToCheck = (workspaceMapping.get(workspace) ?? []).filter((workspace) => !checkingDependencies.includes(workspace));
    const childScopes = (await Promise.all(dependenciesToCheck.map((childWorkspace) => this.getContext(childWorkspace, map, root, [workspace, dependenciesToCheck, checkingDependencies].flat())))).filter(<T>(value: T | undefined): value is T => value !== undefined);

    if (helmFiles.has(workspace)) {
      const helmFile = helmFiles.get(workspace);

      const defaultValue: ExtendedSchemaType = {
        ...helmFile,
        variable: {},
        service: {},
        alias: helmFile?.alias ?? this.getAlias(workspace, root),
        job: {}
      };

      const environment: Record<'global' | 'scoped', ExtendedSchemaType> = {
        global: this.groupScopes([...childScopes.map((scope) => scope.global), cloneDeep(defaultValue)], workspace),
        scoped: this.groupScopes([...childScopes.map((scope) => scope.scoped), cloneDeep(defaultValue)], workspace)
      };

      Object.entries(helmFile?.service ?? {}).forEach(([definitionName, service]) => {
        let realDefinitionName: string | undefined = undefined;
        if (service.type === 'scoped') {
          realDefinitionName = `k${hash}_${definitionName}`;
        }

        const refTarget = service.type === 'scoped' ? environment.scoped : environment.global;

        Object.entries(service.environment ?? {}).forEach(([k, v]) => {
          let cloned = cloneDeep({
            ...v,
            sourcePath: workspace.getDirectory(),
            type: v.type ?? service.type,
            external: true
          }) as Exclude<ExtendedSchemaType['variable'], undefined>[string]; // Ugly type cast, since type is complex.

          // Put unbound copy into global scope to make sure that we pull the correct variables.
          if (helmFile?.is_service && service.type !== 'global') {
            environment.global.variable[`${this.getAlias(workspace, root)}.${realDefinitionName ?? definitionName}.${k}`] = {
              ...v,
              sourcePath: workspace.getDirectory(),
              type: 'global',
              binding: {},
              static: false,
              external: true
            };

            environment.scoped.variable[`${realDefinitionName ?? definitionName}.${k}`] = {
              ...v,
              // is_global: false,
              sourcePath: workspace.getDirectory(),
              type: 'scoped',
              binding: (v as any).binding,
              static: false,
              external: true
            };

            // cloned.type = 'scoped';
            cloned = {
              // type: 'scoped',
              // binding: (v as any).binding,
              // external: true,
              // sourcePath: workspace.getDirectory(),
              // case: v.case,

              ref: `${this.getAlias(workspace, root)}.${realDefinitionName ?? definitionName}.${k}`
            };
          }

          if (realDefinitionName) {
            refTarget.variable[`${realDefinitionName}.${k}`] ??= cloneDeep(cloned);
            cloned = {
              ref: `${realDefinitionName}.${k}`
            };
          }

          const refString = `${definitionName}.${k}`;
          refTarget.__scope ??= {};

          // environment.global.binding ??= {};
          // environment.global.binding[refString] = refString;

          refTarget.__scope[`${definitionName}.environment.${k}`] ??= {
            ref: refString
          };
          refTarget.variable[refString] = cloned;
        });

        let scopedDefinitionName = realDefinitionName ?? definitionName;

        if (service.type !== 'global') {
          scopedDefinitionName = `k${hash}-${realDefinitionName ?? definitionName}`;
        }

        const scopedKey = `${realDefinitionName ?? definitionName}.${service.origin_name_var}`;
        refTarget.variable[scopedKey] ??= {
          type: 'scoped',
          default: scopedDefinitionName.replaceAll('_', '-'),
          sourcePath: workspace.getDirectory(),
          external: true
        };

        if (realDefinitionName) {
          refTarget.__scope ??= {};
          refTarget.__scope[`${definitionName}.${service.origin_name_var}`] ??= {
            ref: scopedKey
          };
        }

        refTarget.__scope ??= {};
        const scopedEnvironmentKey = `${realDefinitionName ?? definitionName}.origin_name_var`;
        refTarget.__scope[scopedEnvironmentKey] = {
          ref: scopedKey
        };

        if (realDefinitionName) {
          const scopedEnvironmentKeyRef = `${definitionName}.origin_name_var`;
          refTarget.__scope[scopedEnvironmentKeyRef] = {
            ref: scopedEnvironmentKey
          };
        }

        refTarget.service ??= {};
        refTarget.service[realDefinitionName ?? definitionName] = {
          ...service,
          is_local: false
        };
      });

      if (helmFile?.variable) {
        Object.entries(helmFile.variable).map(([k, valueValue]) => {
          if (valueValue.type.startsWith('global')) {
            environment.global.variable[k] = {
              sourcePath: workspace.getDirectory(),
              ...valueValue
            };
          } else {
            environment.scoped.variable[k] = {
              sourcePath: workspace.getDirectory(),
              ...valueValue
            };
          }
        });
      }

      if (helmFile?.job) {
        environment.global.job ??= {};
        environment.scoped.job ??= {};
        Object.entries(helmFile.job).map(([k, valueValue]) => {
          let scope = environment.scoped;
          if (valueValue.type.startsWith('global')) {
            scope = environment.global;
          }

          const variable: (typeof scope)['variable'] = {};
          const __scope: Exclude<(typeof scope)['__scope'], undefined> = {};

          Object.entries(valueValue.variable ?? {}).forEach(([key, value]) => {
            variable[key] = {
              ...value,
              type: 'global',
              sourcePath: workspace.getDirectory()
            };
          });

          scope.job![k] = {
            workspace,
            ...valueValue,
            variable,
            __scope
          };
        });
      }

      if (helmFile?.is_service) {
        const alias = environment.scoped.alias;
        environment.global.service ??= {};
        environment.global.service[alias] = {
          is_local: true,
          workspace: workspace
        };
        environment.global.variable[`${alias}.origin_name_var`] = {
          sourcePath: workspace.getDirectory(),
          type: 'global',
          static: true,
          default: alias
        };
      }

      return environment;
    }

    if (childScopes.some((scope) => scope)) {
      const result = {
        global: this.groupScopes(
          childScopes.map((childScope) => childScope.global),
          workspace
        ),
        scoped: this.groupScopes(
          childScopes.map((childScopes) => childScopes.scoped),
          workspace
        )
      };
      return result;
    }

    return undefined;
  }

  async execute(__workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    const workspaceMapping = await this.collectHelmFiles(packageManager, rootDirectory);

    const [helmFiles] = workspaceMapping;

    await Promise.all(
      Array.from(helmFiles.keys()).map(async (workspace) => {
        const context = await this.getContext(workspace, workspaceMapping, rootDirectory);

        if (!context) {
          console.warn(`No context found for ${workspace.getName()}`);
          return;
        }

        this.globalContext = this.groupScopes([this.globalContext, context.global], workspace);
        this.contexts.set(workspace, context.scoped);
      })
    );
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    // NO-OP
  }
}
