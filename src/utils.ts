import fs from "fs";
import path from "path";

export async function delay(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

function isFile(path: string): boolean {
  return fs.existsSync(path) && !fs.lstatSync(path).isDirectory();
}

// Based on Jest's implementation for finding the jest.config file:
// https://github.com/facebook/jest/blob/master/packages/jest-config/src/resolveConfigPath.ts
export function findFile(
  filename: string | string[],
  pathToResolve: string
): string | false {
  const filenames = Array.isArray(filename) ? filename : [filename];

  const resolvedPath = filenames
    .map((p) => path.resolve(pathToResolve, p))
    .find(isFile);

  if (resolvedPath) {
    return resolvedPath;
  }

  if (pathToResolve === path.dirname(pathToResolve)) {
    return false;
  }

  return findFile(filenames, path.dirname(pathToResolve));
}
