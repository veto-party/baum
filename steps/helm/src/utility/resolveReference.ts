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