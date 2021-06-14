import os from "os";
import { Tags } from "./types";

export class AutoTagger {
  tags(): Tags {
    return {
      hostname: os.hostname(),
    };
  }
}
