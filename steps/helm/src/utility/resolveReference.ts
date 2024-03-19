import { VariableType } from "../types/types.js";

export const resolveReference = (refName: string, allScopedVars: Record<string, Partial<VariableType> & { ref?: string; }>, allGlobalVars: Record<string, Partial<VariableType> & { ref?: string; }>) => {

  let lastKey = refName;
  let currentVar = allScopedVars[refName] ?? allGlobalVars[refName];
  while (currentVar?.ref !== undefined) {
    lastKey = currentVar.ref;
    currentVar = allScopedVars[currentVar.ref] ?? allGlobalVars[currentVar.ref];
  };

  return [lastKey, currentVar] as const;
}

export const resolveBindings = (refName: Record<string, string>, allScopedVars: Record<string, Partial<VariableType> & { ref?: string; }>, allGlobalVars: Record<string, Partial<VariableType> & { ref?: string; }>) => {
  const resolvedVars: typeof allScopedVars = {
  };

  let lookupVars = Object.entries(refName);

  while (lookupVars.length > 0) {
    const [key, lookupKey] = lookupVars.pop()!;
    if (resolvedVars[key]) {
      throw new Error(`Duplicate assignment whilist resolving (${JSON.stringify(key)})`);
    }

    const lookup = allScopedVars[lookupKey] ?? allGlobalVars[key];

    if (!lookup) {
      throw new Error(`Missing lookup for ${JSON.stringify(lookupKey)} is missing in socped + global vars.`);
    }

    resolvedVars[lookupKey] = lookup;

    if (lookup.binding) {
      lookupVars.push(...Object.entries(lookup.binding));
    }
  }

  return resolvedVars;
}