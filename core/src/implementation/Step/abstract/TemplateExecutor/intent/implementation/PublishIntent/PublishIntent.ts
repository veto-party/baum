import zod from 'zod';
import { GroupStep } from '../../../../../../../index.js';
import { IPublishIntent } from '../../../../../../../interface/PackageManager/executor/IPackageManagerExecutor.js';
import { AIntent } from '../../AIntent.js';
import { ModifyNPMRC } from './ModifyNPMRC.js';

const publishIntentValidation = zod.object({
  registry: zod.string().url().optional(),
  token: zod.string().optional(),
  forcePublic: zod.boolean().optional()
});

class PublishIntent extends AIntent<[string] | [string, 'public']> implements IPublishIntent {

  readonly name = 'publish';

  constructor(
    private registry?: string,
    private token?: string,
    private forcePublic = false
  ) {
    super();
  }

  setAuthorization(token: string): IPublishIntent {
    return new PublishIntent(this.registry, token, this.forcePublic);
  }

  setRegistry(registry?: string): IPublishIntent {
    return new PublishIntent(registry, this.token, this.forcePublic);
  }

  setForcePublic(force?: boolean | undefined): IPublishIntent {
    return new PublishIntent(this.registry, this.token, force);
  }

  validate(): void {
    const result = publishIntentValidation.safeParse(this);

    if (!result.success) {
      throw result.error;
    }
  }

  getPrepareStep = () => {
    if (!this.token) {
      return new GroupStep([]); // For now return empty step. // TODO: This could be undefined to improve performance.
    }

    const url = new URL(this.registry!);

    return new ModifyNPMRC(`
${url.toString().substring(url.protocol.length)}:_authToken="${this.token}"
${url.toString().substring(url.protocol.length)}:always-auth=true
`);
  };

  toGroup(): [string] | [string, 'public'] {
    this.validate();

    const registry = Array.isArray(this.registry) ? this.registry[0] : this.registry!;

    if (!this.forcePublic) {
      return [registry];
    }

    return [registry, 'public'];
  }
}

export { PublishIntent };
