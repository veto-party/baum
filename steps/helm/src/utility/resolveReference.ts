import type { ExtendedSchemaType } from '../HelmGeneratorProvider.js';

export const resolveReference = (ref: string, scope: ExtendedSchemaType, allGlobalVars: ExtendedSchemaType, is_global?: boolean) => {
  let variable: [ExtendedSchemaType['variable'][string] & { is_global: boolean }, string] = [
    {
      ref,
      is_global: is_global ?? false
    },
    'INITIAL'
  ];

  while (variable[0]?.ref !== undefined) {
    if (variable[0].ref === variable[1]) {
      throw new Error(`Cannot resolve reference: ${JSON.stringify(ref)}, circular depdency detected.`);
    }

    if (!variable[0].is_global) {
      const scopedResult = scope.variable[variable[0].ref] ?? scope.__scope?.[variable[0].ref];
      if (scopedResult) {
        variable = [
          {
            ...scopedResult,
            is_global: false
          },
          variable[0].ref
        ];
        continue;
      }

      const globalResult = allGlobalVars.variable[variable[0].ref] ?? allGlobalVars.__scope?.[variable[0].ref];
      if (globalResult) {
        variable = [
          {
            ...globalResult,
            is_global: true
          },
          variable[0].ref
        ];
        continue;
      }

      throw new Error(`Cannot resolve reference: ${JSON.stringify(ref)} --> ${JSON.stringify(variable[0].ref)}, checked global and scoped context.`);
    }

    const globalResult = allGlobalVars.variable[variable[0].ref] ?? allGlobalVars.__scope?.[variable[0].ref];
    if (globalResult) {
      variable = [
        {
          ...globalResult,
          is_global: true
        },
        variable[0].ref
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

export const resolveBindings = (refName: Record<string, string>, allScopedVars: ExtendedSchemaType, allGlobalVars: ExtendedSchemaType, is_global?: boolean) => {
  const resolvedVars: Record<string, (typeof allScopedVars)['variable'][string] & { is_global: boolean; referenced: string }> = {};

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
