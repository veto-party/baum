import Path from 'node:path';
import { CommandStep, GroupStep, type IExecutablePackageManager, type IStep, type IWorkspace, ParallelStep, RetryStep, RunOnce } from '@veto-party/baum__core';

/**
 * @internal
 */
@RunOnce()
export class HelmPacker implements IStep {
  private packages: string[] = [];

  addPackage(name: string) {
    this.packages.push(name);
  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    const subChartsDir = Path.join(rootDirectory, 'helm', 'subcharts');

    const installSteps = new ParallelStep([]);
    this.packages.forEach((chart) => {
      installSteps.addExecutionStep(`Install helm -- ${JSON.stringify(chart)}`, new RetryStep(new CommandStep('helm dep update .', Path.join(subChartsDir, chart))));
    });

    const validationStep = new ParallelStep([]);
    this.packages.forEach((chart) => {
      validationStep.addExecutionStep(`Install helm -- ${JSON.stringify(chart)}`, new CommandStep('helm lint .', Path.join(subChartsDir, chart)));
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
