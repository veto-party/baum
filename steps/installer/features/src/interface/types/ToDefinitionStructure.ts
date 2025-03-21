import type { KeyValuePair } from "./KeyValuePair.js";
import type { MakeTuple } from "./MakeTuple.js";
import type { StringToNumber } from "./StringToNumber.js";


export type ToDefinitionStructure<Path, Target> =

    Path extends string ?

        // No path is given, return target
        Path extends undefined ? Target: 

        Path extends '' ? Target :

        // Path is given and contains . : return Key value pair recurisive 
        Path extends `["${infer Path}"]` ? KeyValuePair<Path, Target> :
        Path extends `[${infer index}]` ? MakeTuple<Target, StringToNumber<index>> :

        Path extends `${infer U}["${infer Path}"]` ? ToDefinitionStructure<U, KeyValuePair<Path, Target>> :
        Path extends `${infer U}[${infer index}]` ? ToDefinitionStructure<U, MakeTuple<Target, StringToNumber<index>>> :

        // Aray witn prefix
        Path extends `${infer U}["${infer Path}"].${infer Rest}` ?  ToDefinitionStructure<U, KeyValuePair<Path, ToDefinitionStructure<Rest, Target>>> :
        Path extends `${infer U}[${infer index}].${infer Rest}` ? ToDefinitionStructure<U, MakeTuple<ToDefinitionStructure<Rest, Target>, StringToNumber<index>>> : 
        // Path is given contain contains array access : return unknown, since we do not want to allow array access (for now).
        Path extends `["${infer Path}"].${infer Rest}` ?  KeyValuePair<Path, ToDefinitionStructure<Rest, Target>> :
        Path extends `[${infer index}].${infer Rest}` ? MakeTuple<ToDefinitionStructure<Rest, Target>, StringToNumber<index>> : 

        Path extends `${infer U}.${infer Rest}` ? ToDefinitionStructure<U, ToDefinitionStructure<Rest, Target>> :
        KeyValuePair<Path, Target>
    : Target;

