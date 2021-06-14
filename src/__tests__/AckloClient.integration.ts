import mock from "mock-fs";
import { AckloClient } from "../AckloClient";
import fs from "fs";
import { configureGlobalLoggerInstance } from "../Logger";
import { stderr } from "process";
import { mocked } from "ts-jest/utils";

const TOKEN_ENV_VAR = "ACKLO_INTEGRATION_TEST_TOKEN";
const token = process.env[TOKEN_ENV_VAR];
if (!token) {
  throw new Error(`Need ${TOKEN_ENV_VAR} env var set to run integration tests`);
}

describe("acklo (integration)", () => {
  jest.spyOn(stderr, "write").mockImplementation(undefined);
  const stderrMock = mocked(stderr.write);

  beforeAll(() => {
    configureGlobalLoggerInstance("info");
  });

  afterAll(() => {
    configureGlobalLoggerInstance("off");
  });

  describe("with a valid config template", () => {
    beforeEach(() => {
      mock({
        "acklo.config.yml": fs
          .readFileSync(
            "./src/configTemplateFile/__tests__/configTemplateExample.yml"
          )
          .toString("utf-8"),
      });
    });

    afterEach(() => {
      mock.restore();
    });

    it("connects to the acklo api and retrieves config values", async () => {
      const instance = new AckloClient({
        applicationName: "sdk-test-target",
        environmentName: "integration-test",
        accessToken: token,
      });

      expect(instance.getConfig()).toMatchInlineSnapshot(`
      Object {
        "app_config.log_level": "trace",
        "app_config.port": 3000,
        "feature_switches.motd": "Be good to each other.",
        "feature_switches.new_header": false,
      }
    `);

      await expect(instance.connect()).resolves.toBeInstanceOf(AckloClient);

      expect(instance.getConfig()).toMatchInlineSnapshot(`
      Object {
        "app_config.log_level": "trace",
        "app_config.port": 3000,
        "feature_switches.motd": "Good morning!",
        "feature_switches.new_header": false,
      }
    `);

      expect(instance.getConfigRaw()).toMatchInlineSnapshot(`
      Object {
        "app_config.log_level": "trace",
        "app_config.port": "3000",
        "feature_switches.motd": "Good morning!",
        "feature_switches.new_header": "false",
      }
    `);

      expect(instance.get("app_config.log_level")).toMatchInlineSnapshot(
        `"trace"`
      );

      expect(instance.getRaw("app_config.port")).toMatchInlineSnapshot(
        `"3000"`
      );

      expect(instance.getInstanceName()).toMatch(/^ins-\w+-\w+-\w+$/);
      expect(instance.getInstanceUrl()).toMatch(
        /^http.*applications\/sdk-test-target\/integration-test\/instances\/.*$/
      );

      await expect(instance.disconnect()).resolves.toBeInstanceOf(AckloClient);

      const loggedLines = stderrMock.mock.calls.map((c) => c[0]);
      expect(loggedLines).toMatchObject([
        expect.stringContaining("Connected to acklo!"),
      ]);
    });

    it("returns defaults when the api cannot be reached", async () => {
      const instance = new AckloClient({
        applicationName: "sdk-test-target",
        environmentName: "integration-test",
        accessToken: "not-a-valid-token",
      });

      await expect(instance.connect()).resolves.toBe(instance);

      expect(instance.getConfig()).toMatchInlineSnapshot(`
      Object {
        "app_config.log_level": "trace",
        "app_config.port": 3000,
        "feature_switches.motd": "Be good to each other.",
        "feature_switches.new_header": false,
      }
    `);

      await expect(instance.disconnect()).resolves.toBe(instance);

      const loggedLines = stderrMock.mock.calls.map((c) => c[0].toString());
      expect(loggedLines.filter((l) => l.indexOf("acklo:error") > -1))
        .toMatchInlineSnapshot(`
      Array [
        "[acklo:error] An invalid access token has been provided. Please configure your SDK with a valid access token.
      ",
      ]
    `);
    });
  });

  describe("when the config template has an error in it", () => {
    const mockExit = jest.spyOn(process, "exit").mockImplementation();

    beforeAll(() => {
      mock({
        "acklo.config.yml": "not-valid!",
      });
    });

    afterAll(() => {
      mock.restore();
      mockExit.mockRestore();
    });

    it("exits with a friendly error message", () => {
      stderrMock.mockReset();

      new AckloClient({
        applicationName: "sdk-test-target",
        environmentName: "integration-test",
        accessToken: token,
      });

      expect(stderrMock.mock.calls[0]).toMatchSnapshot();
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
