import Path from 'node:path';
import { CachedFN, ConditionalStep, type IStep, Resolver } from '@veto-party/baum__core';
import { type DiffResult, type SimpleGit, simpleGit } from 'simple-git';

const skipped = Symbol('skipped');

export class ConditionalGitDiffStep extends ConditionalStep<ConditionalGitDiffStep> {
  private diffMap = new Map<string, DiffResult['files'] | typeof skipped>();

  @CachedFN(false)
  private ensureGit(root: string) {
    return simpleGit(root, {
      baseDir: root
    });
  }

  private async ensureGitDiff(root: string, base: string): Promise<DiffResult['files'] | typeof skipped> {
    if (typeof this.dontSkipChangeChecks === 'boolean' && !this.dontSkipChangeChecks) {
      return skipped;
    }

    if (typeof this.dontSkipChangeChecks === 'function' && !(await this.dontSkipChangeChecks(root, this.ensureGit(root)))) {
      return skipped;
    }

    const gitRoot = await this.ensureGit(root).revparse('--show-toplevel');
    base = Resolver.ensureAbsolute(base, root);

    if (!this.diffMap.has(base)) {
      let result = await this.getGitDiff(root);
      if (result !== skipped) {
        result = result.filter((file) => Resolver.ensureAbsolute(file.file, gitRoot).startsWith(base));
      }
      this.diffMap.set(base, result);
    }

    return this.diffMap.get(base)!;
  }

  @CachedFN(true)
  private async getGitDiff(root: string): Promise<DiffResult['files'] | typeof skipped> {
    const git = this.ensureGit(root);
    const branch = await this.targetBranchGetter(root, git);

    const remotes = ((await git.remote([])) ?? '').split('\n').map((el) => el.trim());

    let prefix = '';

    for (const remote of remotes) {
      
      if (remote === '') {
        continue;
      }

      const hasFetched = await git.fetch(remote).then(
      () => true,
      () => false
    );
      const hasPulled =
        hasFetched &&
        (await git.pull(remote, branch).then(
          () => true,
          () => false
        ));

      if (hasPulled) {
        prefix = `${remote}/`;
        break;
      }
    }


    const raw_changes = await git.diffSummary(`HEAD..${prefix}${branch}`).catch((error) => {
      console.warn(error);
      return git.diffSummary(`${prefix}${branch}..HEAD`);
    });

    console.log(raw_changes);

    return raw_changes.files ?? [];
  }

  constructor(
    step: IStep,
    private targetBranchGetter: (root: string, git: SimpleGit) => string | Promise<string>,
    private dontSkipChangeChecks: boolean | ((root: string, git: SimpleGit) => boolean | Promise<boolean>) = true
  ) {
    super(step, async (workspace, _pm, rootDirectory) => {
      const path = Path.resolve(workspace.getDirectory());
      const diff = await this.ensureGitDiff(rootDirectory, path);

      if (diff === skipped) {
        return true;
      }

      return diff.length !== 0;
    });
  }
}
