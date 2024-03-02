import { array, object, string } from 'zod';

export const structure = object({
    packageManager: object({}).required(),
    rootDirectory: string(),
    steps: array(object({
        name: string(),
        step: object({})
    }).required()).min(1, "at least one step is required to run baum")
}).required()