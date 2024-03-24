import type { ExtendedSchemaType } from '../HelmGeneratorProvider.js';

export const resolveReference = (
  variable: [Partial<ExtendedSchemaType['variable']>[string] & { ref?: string; is_global?: boolean }, string],
  allScopedVars: Record<string, Partial<ExtendedSchemaType['variable']>[string] & { ref?: string }>,
  allGlobalVars: Record<string, Partial<ExtendedSchemaType['variable']>[string] & { ref?: string }>
) => {
  while (variable[0]?.ref !== undefined) {
    if (!variable[0].is_global) {
      variable = [allScopedVars[variable[0].ref] ?? allGlobalVars[variable[0].ref], variable[0].ref];
    } else {
      variable = [allGlobalVars[variable[0].ref], variable[0].ref];
    }
  }

  return variable;
};

export const resolveBindings = (refName: Record<string, string>, allScopedVars: Record<string, Partial<ExtendedSchemaType['variable']>[string] & { ref?: string }>, allGlobalVars: Record<string, Partial<ExtendedSchemaType['variable']>[string] & { ref?: string }>) => {
  const resolvedVars: Record<string, (typeof allScopedVars)[string] & { is_global: boolean }> = {};

  const lookupVars = Object.entries(refName);

  while (lookupVars.length > 0) {
    const [key, lookupKey] = lookupVars.pop()!;
    if (resolvedVars[key]) {
      throw new Error(`Duplicate assignment whilist resolving (${JSON.stringify(key)})`);
    }

    const lookup = allScopedVars[lookupKey] ?? allGlobalVars[lookupKey];

    if (!lookup) {
      throw new Error(`Missing lookup for ${JSON.stringify(lookupKey)} is missing in socped + global vars.`);
    }

    resolvedVars[key] = {
      ...lookup,
      is_global: allGlobalVars[lookupKey] === lookup
    };

    if (lookup.binding) {
      lookupVars.push(...Object.entries(lookup.binding));
    }
  }

  return resolvedVars;
};
