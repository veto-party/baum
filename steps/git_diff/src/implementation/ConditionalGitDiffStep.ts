import Path from 'node:path';
import { ConditionalStep, type IStep } from '@veto-party/baum__core';
import { DiffResult, type SimpleGit, simpleGit } from 'simple-git';

const skipped = Symbol('skipped');

export class ConditionalGitDiffStep extends ConditionalStep<ConditionalGitDiffStep> {

  private diffMap = new Map<string, DiffResult | typeof skipped>();

  private async ensureGitDiff(root: string, base: string): Promise<DiffResult | typeof skipped> {
    base = Path.resolve(base);
    if (!this.diffMap.has(base)) {
      this.diffMap.set(base, await this.getGitDiff(root, base));
    }

    return this.diffMap.get(base)!;
  }

  private async getGitDiff(root: string, base: string): Promise<DiffResult | typeof skipped> {
    if (typeof this.dontSkipChangeChecks === 'boolean' && !this.dontSkipChangeChecks) {
      return skipped;
    }

    const git = simpleGit(root, {
      baseDir: base
    });

    if (typeof this.dontSkipChangeChecks === 'function' && !(await this.dontSkipChangeChecks(root, git))) {
      return skipped;
    }
    const raw_changes = await git.diffSummary({
      from: await this.targetBranchGetter(root, git),
      to: 'HEAD'
    });

    return raw_changes;
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

      return diff.changed === 0;
    });
  }
}
