import { ConsoleLogger } from "../Logger";
import { stderr, stdout } from "process";
import { mocked } from "ts-jest/utils";
import { LogLevel } from "../ClientConfiguration";

describe("ConsoleLogger", () => {
  let logger: ConsoleLogger;

  jest.spyOn(stderr, "write").mockImplementation(undefined);
  jest.spyOn(stdout, "write").mockImplementation(undefined);
  const stderrMock = mocked(stderr.write);

  beforeEach(() => {
    logger = new ConsoleLogger("debug");
    stderrMock.mockReset();
  });

  it("logs to stderr", () => {
    logger.info("hey");
    expect(stdout.write).toHaveBeenCalledTimes(0);
    expect(stderrMock.mock.calls).toHaveLength(1);
    expect(stderrMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "[acklo:info] hey
      ",
      ]
    `);
  });

  it("formats strings per util.format", () => {
    logger.info("%s is my favourite %o", "alpha", {
      animal: "dog",
      vehicle: "car",
    });
    expect(stderrMock.mock.calls).toHaveLength(1);
    expect(stderrMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "[acklo:info] alpha is my favourite { animal: 'dog', vehicle: 'car' }
      ",
      ]
    `);
  });

  it("prefixes each log line with an acklo brand", () => {
    logger.info("hey\nbro\nmany\nlines");
    expect(stderrMock.mock.calls.map((c) => c[0])).toMatchInlineSnapshot(`
      Array [
        "[acklo:info] hey
      [acklo:info] bro
      [acklo:info] many
      [acklo:info] lines
      ",
      ]
    `);
  });

  it("indents multi-line log messages per the first line's indent size", () => {
    logger.info("  there are two\nspaces before me");
    expect(stderrMock.mock.calls.map((c) => c[0])).toMatchInlineSnapshot(`
      Array [
        "[acklo:info]   there are two
      [acklo:info]   spaces before me
      ",
      ]
    `);
  });

  describe("only outputs logs at or above the configured logging level", () => {
    it.each([
      ["off", 0],
      ["error", 1],
      ["info", 2],
      ["debug", 3],
    ])("%s level", (level, expectedLogs) => {
      logger = new ConsoleLogger(level as LogLevel);
      logger.debug("");
      logger.info("");
      logger.error("");
      expect(stderrMock).toHaveBeenCalledTimes(expectedLogs);
    });
  });
});
