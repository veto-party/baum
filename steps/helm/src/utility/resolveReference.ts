import type { ExtendedSchemaType } from '../HelmGeneratorProvider.js';

const resolveFromArray = (refName: string, scope: Pick<ExtendedSchemaType, 'variable' | '__scope'> | Pick<ExtendedSchemaType, 'variable' | '__scope'>[]) => {
  if (Array.isArray(scope)) {
    const lookup = scope.find((scope) => (scope.variable[refName] ?? scope.__scope?.[refName]) !== undefined);

    if (!lookup) {
      return;
    }

    scope = lookup;
  }

  return scope.variable[refName] ?? scope.__scope?.[refName];
};

export const resolveReference = (ref: string, scope: Pick<ExtendedSchemaType, 'variable' | '__scope'> | Pick<ExtendedSchemaType, 'variable' | '__scope'>[], allGlobalVars: Pick<ExtendedSchemaType, 'variable' | '__scope'> | Pick<ExtendedSchemaType, 'variable' | '__scope'>[], is_global?: boolean) => {
  let variable: [ExtendedSchemaType['variable'][string] & { is_global: boolean }, string] = [
    {
      ref,
      is_global: is_global ?? false
    },
    'INITIAL'
  ];

  while (variable[0]?.ref !== undefined) {
    const refName = variable[0].ref;
    if (refName === variable[1]) {
      throw new Error(`Cannot resolve reference: ${JSON.stringify(ref)}, circular depdency detected.`);
    }

    if (!variable[0].is_global) {
      const scopedResult = resolveFromArray(refName, scope);
      if (scopedResult) {
        variable = [
          {
            ...scopedResult,
            is_global: false
          },
          refName
        ];
        continue;
      }

      const globalResult = resolveFromArray(refName, allGlobalVars);
      if (globalResult) {
        variable = [
          {
            ...globalResult,
            is_global: true
          },
          refName
        ];
        continue;
      }

      throw new Error(`Cannot resolve reference: ${JSON.stringify(refName)} --> ${JSON.stringify(variable[0].ref)}, checked global and scoped context.`);
    }

    const globalResult = resolveFromArray(refName, allGlobalVars);
    if (globalResult) {
      variable = [
        {
          ...globalResult,
          is_global: true
        },
        refName
      ];
      continue;
    }

    throw new Error(`Cannot resolve reference: ${JSON.stringify(ref)} --> ${JSON.stringify(variable[0].ref)}, checked global context.`);
  }

  if (variable[0].ref) {
    throw new Error(`Cannot resolve reference: ${JSON.stringify(ref)}`);
  }

  return variable;
};

export const resolveBindings = (
  refName: Record<string, string>,
  allScopedVars: Pick<ExtendedSchemaType, 'variable' | '__scope'> | Pick<ExtendedSchemaType, 'variable' | '__scope'>[],
  allGlobalVars: Pick<ExtendedSchemaType, 'variable' | '__scope'> | Pick<ExtendedSchemaType, 'variable' | '__scope'>[],
  is_global?: boolean
) => {
  const resolvedVars: Record<string, Exclude<Pick<ExtendedSchemaType, 'variable' | '__scope'>['variable'], undefined>[string] & { is_global: boolean; referenced: string }> = {};

  const lookupVars = Object.entries(refName);

  while (lookupVars.length > 0) {
    const [key, lookupKey] = lookupVars.pop()!;
    if (resolvedVars[key]) {
      console.warn(`Duplicate assignment whilist resolving (${JSON.stringify(key)})`);
      continue;
    }

    const [lookup, referenced] = resolveReference(lookupKey, allScopedVars, allGlobalVars, is_global);

    resolvedVars[key] = {
      ...lookup,
      referenced
    };

    if (lookup.binding) {
      lookupVars.push(...Object.entries(lookup.binding));
    }
  }

  return resolvedVars;
};
