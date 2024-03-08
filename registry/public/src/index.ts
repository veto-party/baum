import { IExecutablePackageManager, IWorkspace, PKGMStep } from '@veto-party/baum__core';
import { ARegistryStep, GenericVersionManager, VersionManagerVersionOverride } from '@veto-party/baum__registry';

export class PublicRegistryStep extends ARegistryStep {
  private publishStep?: PKGMStep;

  constructor(
    private pinVersion: string,
    private registry: string,
    private token: string
  ) {
    super((workspaces) => new VersionManagerVersionOverride(this.pinVersion, workspaces));
  }

  modifyJSON(json: any) {
    json.version = json.version ?? this.pinVersion ?? GenericVersionManager.MIN_VERSION;
    delete json.private;
  }

  getPublishStep(): PKGMStep | undefined {
    return this.publishStep;
  }

  protected async startExecution(workspace: IWorkspace, pm: IExecutablePackageManager, root: string): Promise<void> {
    await super.startExecution(workspace, pm, root);

    this.publishStep = new PKGMStep((intent) => intent.publish().setRegistry(this.registry).setForcePublic(false).setAuthorization(this.token));
  }
}
