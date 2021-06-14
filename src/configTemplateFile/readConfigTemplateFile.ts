import { findFile } from "../utils";
import * as fs from "fs";
import { MissingConfigTemplateFile } from "../Errors";

const CONFIG_FILE_NAMES = ["acklo.config.yml", "acklo.config.yaml"];

export default function (): string {
  const searchRoot = process.cwd();
  const path = findPathToConfig(searchRoot);
  return fs.readFileSync(path).toString("utf-8");
}

function findPathToConfig(pathToResolve: string): string {
  const found = findFile(CONFIG_FILE_NAMES, pathToResolve);

  if (!found) {
    throw new MissingConfigTemplateFile();
  }

  return found;
}
