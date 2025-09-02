import Path from 'node:path';
import { allSettledButFailure, CachedFN, ConditionalStep, type IStep, Resolver } from '@veto-party/baum__core';
import { type DiffResult, type SimpleGit, simpleGit } from 'simple-git';

const skipped = Symbol('skipped');

export class ConditionalGitDiffStep extends ConditionalStep<ConditionalGitDiffStep> {
  private diffMap = new Map<string, DiffResult['files'] | typeof skipped>();

  @CachedFN(false)
  private static ensureGit(root: string) {
    return simpleGit(root, {
      baseDir: root
    });
  }

  private async ensureGitDiff(root: string, base: string): Promise<DiffResult['files'] | typeof skipped> {
    if (typeof this.dontSkipChangeChecks === 'boolean' && !this.dontSkipChangeChecks) {
      return skipped;
    }

    if (typeof this.dontSkipChangeChecks === 'function' && !(await this.dontSkipChangeChecks(root, ConditionalGitDiffStep.ensureGit(root)))) {
      return skipped;
    }

    const gitRoot = await ConditionalGitDiffStep.ensureGit(root).revparse('--show-toplevel');
    base = Resolver.ensureAbsolute(base, root);

    if (!this.diffMap.has(base)) {
      let result = await ConditionalGitDiffStep.getGitDiff(root, await this.targetBranchGetter(root));
      if (result !== skipped) {
        result = result.filter((file) => Resolver.ensureAbsolute(file.file, gitRoot).startsWith(base));
      }
      this.diffMap.set(base, result);
    }

    return this.diffMap.get(base)!;
  }

  @CachedFN(true)
  public static async getCurrentBranch(root: string) {
    const git = ConditionalGitDiffStep.ensureGit(root);
    return (await git.branch()).current;
  }

  @CachedFN(true)
  public static async getAllBranches(root: string) {
    const git = ConditionalGitDiffStep.ensureGit(root);
    await git.fetch();
    const remotes = (await git.getRemotes()).map((remote) => remote.name);
    const branches = (
      await allSettledButFailure([
        git.branch().then((branch) =>
          branch.all.map((givenBranch) => {
            for (const remote of remotes) {
              if (givenBranch.startsWith(`remote/${remote}/`)) {
                return givenBranch.substring(`remote/${remote}/`.length);
              }
            }

            return givenBranch;
          })
        ),
        git.branchLocal().then((branch) => branch.all)
      ])
    ).flat(2);

    return branches;
  }

  @CachedFN(true)
  public static async getGitDiff(root: string, branch: string): Promise<DiffResult['files'] | typeof skipped> {
    const git = ConditionalGitDiffStep.ensureGit(root);
    const remotes = ((await git.remote([])) ?? '').split('\n').map((el) => el.trim());

    let prefix = 'refs/heads/';

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

    return await ConditionalGitDiffStep.diffSummary(root, `${prefix}${branch}`);
  }

  @CachedFN(true)
  public static async gitHash(root: string) {
    return await ConditionalGitDiffStep.ensureGit(root).revparse('HEAD');
  }

  public static async diffSummary(root: string, target: string) {
    const raw_changes = await ConditionalGitDiffStep.ensureGit(root).diffSummary(`HEAD..${target}`);
    return raw_changes.files ?? [];
  }

  private targetBranchGetter(root: string) {
    if (typeof this.__targetBranchGetter === 'string') {
      return this.__targetBranchGetter;
    }

    const git = ConditionalGitDiffStep.ensureGit(root);
    return this.__targetBranchGetter(root, git);
  }

  constructor(
    step: IStep,
    private __targetBranchGetter: ((root: string, git: SimpleGit) => string | Promise<string>) | string,
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
