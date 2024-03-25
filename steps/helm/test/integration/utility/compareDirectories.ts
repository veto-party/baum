import FileSystemSync from 'node:fs';
import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import 'colors';
import * as Diff from 'diff';

export async function compareDirectories(pathA: string, pathB: string) {
  const filesA = FileSystemSync.readdirSync(pathA);
  const filesB = FileSystemSync.readdirSync(pathB);

  if (filesA.length !== filesB.length) {
    console.error(`File count is different....  ${JSON.stringify(filesA)} ${JSON.stringify(filesB)}`);
    return false;
  }

  for (const file of filesA) {
    if ((await FileSystem.stat(Path.join(pathA, file))).isDirectory()) {
      if (!(await compareDirectories(Path.join(pathA, file), Path.join(pathB, file)))) {
        return false;
      }
    } else {
      const fileA = FileSystemSync.readFileSync(Path.join(pathA, file), 'utf-8');
      const fileB = FileSystemSync.readFileSync(Path.join(pathB, file), 'utf-8');

      const diff = Diff.diffLines(fileA, fileB);

      if (diff.some((value) => value.added || value.removed)) {
        console.error(`File ${file} is different`);
        diff.forEach((change, lineNo) => {
          if (change.added) {
            console.log(`(+) (${file}:${lineNo}): ${change.value}`.bgGreen.white);
          } else if (change.removed) {
            console.log(`(-) (${file}:${lineNo}): ${change.value}`.bgRed.white);
          }
        });
        return false;
      }
    }
  }

  return true;
}
