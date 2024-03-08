import { ADockerStep } from "./ADockerStep.js";

export class DockerBuildStep extends ADockerStep {
    constructor(
        subCommand: string,
        cwd: string,
        processValidation: (code: number | null) => boolean = (code) => code === 0
    ) {
        super(`build ${subCommand},`, cwd, processValidation);
    }
}