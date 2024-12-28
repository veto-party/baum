import { BaumManager, type IBaumManagerConfiguration, type ICloneable, type IExecutablePackageManager, type ISettableStep, type IStep, type IWorkspace, RunOnce } from '@veto-party/baum__core';
import { HelmGenerator } from './HelmGenerator.js';
import { HelmGeneratorProvider } from './HelmGeneratorProvider.js';
import { HelmPacker } from './HelmPacker.js';
import type { ICurrentVersionManager } from './VersionStrategy/CurrentVersionMangager/ICurrentVersionManager.js';

@RunOnce()
export class Helm extends BaumManager implements IStep {
  constructor(parent: IBaumManagerConfiguration) {
    if (!(parent instanceof BaumManager)) {
      throw new Error('Currently only baum manager instances supported (Should only end up here with custom code)');
    }

    super(parent);
  }

  protected fileProvider: ConstructorParameters<typeof HelmGeneratorProvider>[0] = () => 'helm.veto.json';

  setFileProvider(provider: ConstructorParameters<typeof HelmGeneratorProvider>[0]): this {
    this.fileProvider = provider;
    return this;
  }

  protected filter: ConstructorParameters<typeof HelmGeneratorProvider>[1] = () => true;

  setFilter(filter: ConstructorParameters<typeof HelmGeneratorProvider>[1]): this {
    this.filter = filter;
    return this;
  }

  protected aliasGenerator: ConstructorParameters<typeof HelmGeneratorProvider>[2] = undefined;

  setAliasGenerator(aliasGenerator: ConstructorParameters<typeof HelmGeneratorProvider>[2]): this {
    this.aliasGenerator = aliasGenerator;
    return this;
  }

  protected dockerFileGenerator?: ConstructorParameters<typeof HelmGenerator>[1];

  setDockerFileGenerator(dockerFileGenerator: ConstructorParameters<typeof HelmGenerator>[1]): this {
    this.dockerFileGenerator = dockerFileGenerator;
    return this;
  }

  protected dockerFileForJobGenerator?: ConstructorParameters<typeof HelmGenerator>[2];

  setDockerFileForJobGenerator(dockerFileForJobGenerator: ConstructorParameters<typeof HelmGenerator>[2]): this {
    this.dockerFileForJobGenerator = dockerFileForJobGenerator;
    return this;
  }

  protected stepWrapper?: ICloneable<IStep & ISettableStep> & ISettableStep;

  setStepWrapper(stepWrapper: ICloneable<IStep & ISettableStep> & ISettableStep): this {
    this.stepWrapper = stepWrapper;
    return this;
  }

  protected versionProvider?: ICurrentVersionManager;

  setVersionProvider(versionProvider: ICurrentVersionManager): this {
    this.versionProvider = versionProvider;
    return this;
  }

  protected name?: string;

  setName(name: string): this {
    this.name = name;
    return this;
  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    this.synchronize();
    this.disableWorkspace = false;
    this.doCopyLockFileStep = undefined;

    const checkList = ['versionProvider', 'dockerFileGenerator', 'dockerFileForJobGenerator'] as const;

    const missing = checkList.filter((key) => this[key] === undefined);
    if (missing.length > 0) {
      throw new Error(`${missing.join(', ')} need to be defined using the given setters.`);
    }

    const packer = new HelmPacker();

    const provider = new HelmGeneratorProvider(this.fileProvider, this.filter, this.aliasGenerator);

    const clonedSteps = [...this.steps];

    const generator = new HelmGenerator(
      provider,
      this.dockerFileGenerator!,
      this.dockerFileForJobGenerator!,
      async (name) => {
        return (await this.versionProvider!.getCurrentVersionFor(name)) ?? '0.0.0';
      },
      this.name
    );

    this.steps.unshift({
      name: 'Provide definition metadata',
      step: provider
    });

    this.steps.push({
      name: 'generate helm files',
      step: generator
    });

    if (this.stepWrapper) {
      this.steps = clonedSteps.map((step) => ({
        ...step,
        step: this.stepWrapper!.clone().setStep(step.step)
      }));
    }

    try {
      await this.run();
    } finally {
      this.steps = clonedSteps;
    }

    await generator.generateGlobalScope(packageManager, rootDirectory);

    try {
      await generator.execute(workspace, packageManager, rootDirectory);
      await generator.flush();
      try {
        await packer.execute(workspace, packageManager, rootDirectory);
      } finally {
        await packer.clean(workspace, packageManager, rootDirectory);
      }
    } finally {
      await generator.clean(workspace, packageManager, rootDirectory);
    }

    await generator.flush();
    await this.versionProvider?.flush();
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    // NO-OP
  }
}
