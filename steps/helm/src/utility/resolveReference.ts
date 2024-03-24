import { VariableType } from "../types/types.js";

export const resolveReference = (variable: [Partial<VariableType> & { ref?: string; }, string], allScopedVars: Record<string, Partial<VariableType> & { ref?: string; }>, allGlobalVars: Record<string, Partial<VariableType> & { ref?: string; }>) => {
  while (variable[0]?.ref !== undefined) {
    variable = [allScopedVars[variable[0].ref] ?? allGlobalVars[variable[0].ref], variable[0].ref];
  };

  return variable;
}

export const resolveBindings = (refName: Record<string, string>, allScopedVars: Record<string, Partial<VariableType> & { ref?: string; }>, allGlobalVars: Record<string, Partial<VariableType> & { ref?: string; }>) => {
  const resolvedVars: Record<string, typeof allScopedVars[string] & { is_global: boolean; }> = {
  };

  let lookupVars = Object.entries(refName);

  while (lookupVars.length > 0) {
    const [key, lookupKey] = lookupVars.pop()!;
    if (resolvedVars[key]) {
      throw new Error(`Duplicate assignment whilist resolving (${JSON.stringify(key)})`);
    }

    const lookup = allScopedVars[lookupKey] ?? allGlobalVars[lookupKey];

    if (!lookup) {
      throw new Error(`Missing lookup for ${JSON.stringify(lookupKey)} is missing in socped + global vars.`);
    }

    resolvedVars[key] =  {
      ...lookup,
      is_global: allGlobalVars[lookupKey] === lookup
    };

    if (lookup.binding) {
      lookupVars.push(...Object.entries(lookup.binding));
    }
  }

  return resolvedVars;
}