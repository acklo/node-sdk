import util from "util";
import { LogLevel } from "./ClientConfiguration";
import chalk, { ChalkFunction } from "chalk";

const levels = {
  off: 50,
  error: 40,
  warn: 30,
  info: 20,
  debug: 10,
};

export interface Logger {
  setLevel(level: LogLevel): void;
  error(format: string, ...args: unknown[]): void;
  warn(format: string, ...args: unknown[]): void;
  info(format: string, ...args: unknown[]): void;
  debug(format: string, ...args: unknown[]): void;
}

export class ConsoleLogger implements Logger {
  constructor(private level: LogLevel) {}

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  error(format: string, ...args: unknown[]): void {
    return this.log("error", format, args);
  }

  warn(format: string, ...args: unknown[]): void {
    return this.log("warn", format, args);
  }

  info(format: string, ...args: unknown[]): void {
    return this.log("info", format, args);
  }

  debug(format: string, ...args: unknown[]): void {
    return this.log("debug", format, args);
  }

  private log(level: LogLevel, format: string, args: unknown[]): void {
    if (levels[this.level] > levels[level]) {
      return;
    }
    const pre = color(level)(`[acklo:${level}]`);
    const formatted = util.format(format, ...args);
    let lines = formatted.split("\n");
    const indent = Array(indentSize(lines[0])).fill(" ").join("");
    lines = lines.map(
      (line, idx) => `${pre}${idx === 0 ? "" : indent} ${line}`
    );
    process.stderr.write(lines.join("\n") + "\n");
  }
}

function indentSize(str: string): number {
  const firstSpaces = str.match(/^ */);
  if (firstSpaces === null) {
    return 0;
  }
  return firstSpaces[0].length;
}

function color(level: LogLevel): ChalkFunction {
  switch (level) {
    case "debug":
      return chalk.green;
    case "info":
      return chalk.blue;
    case "error":
      return chalk.red;
    default:
      return chalk.reset;
  }
}

export class NullLogger implements Logger {
  setLevel(): void {
    // no-op
  }
  error(): void {
    // no-op
  }
  warn(): void {
    // no-op
  }
  info(): void {
    // no-op
  }
  debug(): void {
    // no-op
  }
}

export let logger: Logger = new NullLogger();

export function configureGlobalLoggerInstance(logLevel: LogLevel): void {
  logger = new ConsoleLogger(logLevel);
}
