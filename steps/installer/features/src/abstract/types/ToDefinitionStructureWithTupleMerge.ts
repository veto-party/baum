import type { asConst } from "json-schema-to-ts";
import type { MergeDeepForToDefinitionStructureWithTupleMerge } from "./MergeDeepForToDefinitionStructureWithTupleMerge.js";
import type { ToDefinitionStructure } from "../../interface/types/ToDefinitionStructure.js";


export type ToDefinitionStructureWithTupleMerge<Path, Target, Obj> =
    ToDefinitionStructure<Path, Target> extends infer U ? MergeDeepForToDefinitionStructureWithTupleMerge<Obj, U> extends infer R ? ReturnType<typeof asConst<R>> : never : never;