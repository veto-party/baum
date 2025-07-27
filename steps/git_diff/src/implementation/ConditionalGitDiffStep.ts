import Path from 'node:path';
import { ConditionalStep, Resolver, type IStep } from '@veto-party/baum__core';
import { type DiffResult, type SimpleGit, simpleGit } from 'simple-git';

const skipped = Symbol('skipped');

export class ConditionalGitDiffStep extends ConditionalStep<ConditionalGitDiffStep> {
  private diffMap = new Map<string, DiffResult['files'] | typeof skipped>();

  private async ensureGitDiff(root: string, base: string): Promise<DiffResult['files'] | typeof skipped> {
    base = Path.resolve(base);
    if (!this.diffMap.has(base)) {
      let result = await this.getGitDiff(root);
      if (result !== skipped) {
        result = result.filter((file) => Resolver.ensureAbsolute(file.file).startsWith(base));
      }
      this.diffMap.set(base, result);
    }

    return this.diffMap.get(base)!;
  }

  private async getGitDiff(root: string): Promise<DiffResult['files'] | typeof skipped> {
    if (typeof this.dontSkipChangeChecks === 'boolean' && !this.dontSkipChangeChecks) {
      return skipped;
    }

    const git = simpleGit(root, {
      baseDir: root
    });

    if (typeof this.dontSkipChangeChecks === 'function' && !(await this.dontSkipChangeChecks(root, git))) {
      return skipped;
    }

    const branch = await this.targetBranchGetter(root, git);

    await git.pull('origin', branch).catch(() => undefined);

    const raw_changes = await git.diffSummary(`origin/${branch}..HEAD`);

    return raw_changes.files;
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
