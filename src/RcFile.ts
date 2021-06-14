import { findFile } from "./utils";
import fs from "fs";
import { promisify } from "util";
import * as os from "os";
import * as path from "path";
import YAML from "yaml";

const FILE_NAME = ".acklorc.yml";

export type ProfileName = string;
export interface Profile {
  name: ProfileName;
  accessToken: string;
}

export const DEFAULT_PROFILE_NAME: ProfileName = "default";

export class RcFile {
  private readonly _path: string;
  private profiles: Profile[] = [];

  constructor(
    workingDirectory = process.cwd(),
    defaultDirectory = os.homedir()
  ) {
    this._path =
      findFile(FILE_NAME, workingDirectory) ||
      path.join(defaultDirectory, FILE_NAME);

    this.parseFile();
  }

  get path(): string {
    return this._path;
  }

  profile(profile: ProfileName): Profile | null {
    return this.profiles.find((p) => p.name === profile) || null;
  }

  setProfile(profile: Profile): void {
    const existing = this.profiles.findIndex((p) => p.name === profile.name);
    if (existing > -1) {
      this.profiles.splice(existing, 1);
    }
    this.profiles.push(profile);
  }

  async write(): Promise<void> {
    const writeFile = promisify(fs.writeFile);
    await writeFile(this.path, profilesToYAML(this.profiles));
  }

  private parseFile(): void {
    if (!fs.existsSync(this.path)) {
      return;
    }

    const fileContents = fs.readFileSync(this.path).toString("utf-8");
    const config = YAML.parse(fileContents);

    if (config.profiles) {
      for (const profileKey of Object.keys(config.profiles)) {
        const profile = buildProfile(profileKey, config.profiles[profileKey]);
        if (profile) {
          this.setProfile(profile);
        }
      }
    }
  }
}

function buildProfile(
  name: ProfileName,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: { [p: string]: any }
): Profile | null {
  if (data.accessToken && typeof data.accessToken === "string") {
    return { accessToken: data.accessToken, name };
  }
  return null;
}

function profilesToYAML(profiles: Profile[]): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config: { [key: string]: any } = { profiles: {} };
  for (const profile of profiles) {
    config.profiles[profile.name] = { accessToken: profile.accessToken };
  }
  return YAML.stringify(config);
}
