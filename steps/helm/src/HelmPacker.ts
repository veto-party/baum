import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import { CommandStep, GroupStep, type IExecutablePackageManager, type IStep, type IWorkspace, ParallelStep, RunOnce } from '@veto-party/baum__core';

@RunOnce()
export class HelmPacker implements IStep {
  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    const subChartsDir = Path.join(rootDirectory, 'helm', 'subcharts');

    const possibleSteps = await FileSystem.readdir(subChartsDir);

    const installSteps = new ParallelStep([]);
    possibleSteps.forEach((chart) => {
      installSteps.addExecutionStep(`Install helm -- ${JSON.stringify(chart)}`, new CommandStep('helm dep update .', Path.join(subChartsDir, chart)));
    });
    const validationStep = new ParallelStep([]);

    possibleSteps.forEach((chart) => {
      installSteps.addExecutionStep(`Install helm -- ${JSON.stringify(chart)}`, new CommandStep('helm lint .', Path.join(subChartsDir, chart)));
    });

    const groupStep = new GroupStep([installSteps, validationStep]);

    groupStep.addExecutionStep('Install main helm dependencies', new CommandStep('helm dep update .', Path.join(rootDirectory, 'helm', 'main')));
    groupStep.addExecutionStep('Package main helm chart (including deps)', new CommandStep(`helm package ${Path.join(rootDirectory, 'helm', 'main')}`, rootDirectory));

    await groupStep.execute(workspace, packageManager, rootDirectory);
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    // NO-OP
  }
}
