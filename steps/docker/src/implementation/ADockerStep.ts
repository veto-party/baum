import { CommandStep } from "@veto-party/baum__core";

export class ADockerStep extends CommandStep {
    constructor(
        subCommand: string,
        cwd: string,
        processValidation: (code: number | null) => boolean = (code) => code === 0
    ) {
        super(`docker ${subCommand},`, cwd, processValidation);
    }
}