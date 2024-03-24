import { type IStep, RunOnce, IExecutablePackageManager, IWorkspace, ParallelStep, GroupStep, CommandStep } from "@veto-party/baum__core";
import FileSystem from 'node:fs/promises';
import Path from 'node:path';

@RunOnce()
export class HelmPacker implements IStep {

    async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
        const subChartsDir = Path.join(rootDirectory, 'helm', 'subcharts');

        const parallelStep = new ParallelStep([]);

        (await FileSystem.readdir(subChartsDir)).forEach((chart) => {
            parallelStep.addExecutionStep(`Install helm -- ${JSON.stringify(chart)}`, new CommandStep('helm dep update .', Path.join(subChartsDir, chart)));
        });

        const groupStep = new GroupStep([parallelStep]);

        groupStep.addExecutionStep('Install main helm dependencies', new CommandStep('helm dep update .', Path.join(rootDirectory, 'helm', 'main')));
        groupStep.addExecutionStep('Package main helm chart (including deps)', new CommandStep('helm package . ', Path.join(rootDirectory, 'helm', 'main')));

        await groupStep.execute(workspace, packageManager, rootDirectory);
    }

    async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
        // NO-OP
    }

}