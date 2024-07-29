import { ConditionalStep, IStep } from "@veto-party/baum__core";
import Path from 'node:path';
import { simpleGit, Options } from 'simple-git';

export class ConditionalGitDiffStep extends ConditionalStep {

    private diffMap = new Map<string, string[]>();

    private async ensureGitDiff(root: string): Promise<string[]> {
        root = Path.resolve(root);
        if (!this.diffMap.has(root)) {
            this.diffMap.set(root, await this.getGitDiff(root));
        }

        return this.diffMap.get(root)!;
    }

    private async getGitDiff(root: string): Promise<string[]> {
        const git = simpleGit({
            baseDir: root
        });

        const raw_changes = await new Promise<string>((resolve, reject) => {
            git.raw([`diff HEAD..${this.targetBranchGetter(root)} --name-only`], (err, data) => err ? reject(err) : resolve(data!));
        });

        const line_changes = raw_changes.split("\n").map(String.prototype.trim);

        return line_changes.map((line) => {
            try {
                return Path.resolve(line);
            } catch (error) {
                return '';
            }
        }).filter(Boolean);

    }

    constructor(step: IStep, private targetBranchGetter: (root: string) => string|Promise<string>) {

        super(step, async (workspace, pm, rootDirectory) => {
            const path = Path.resolve(workspace.getDirectory());
            return (await this.ensureGitDiff(rootDirectory)).some((file) => file.startsWith(path));
        })
    } 
} 
