import { ClientConfiguration } from "../ClientConfiguration";
import { MissingRequiredConfigurationValuesError } from "../Errors";

describe("ClientConfiguration", () => {
  it("consolidates the provided config, env vars, and defaults to produce a config", () => {
    const providedConfig = { accessToken: "should-be-overriden" };
    const envVars = {
      ACKLO_ACCESS_TOKEN: "abc-123",
      ACKLO_APPLICATION_NAME: "my-app",
      ACKLO_ENVIRONMENT_NAME: "my-env",
      ACKLO_PROFILE: "dev",
    };

    expect(new ClientConfiguration(providedConfig, envVars))
      .toMatchInlineSnapshot(`
      ClientConfiguration {
        "accessToken": "abc-123",
        "apiBaseUrl": "https://acklo.app/api",
        "applicationName": "my-app",
        "autoTags": true,
        "environmentName": "my-env",
        "heartbeatInterval": 60000,
        "logLevel": "info",
        "profile": "dev",
        "tags": Object {},
        "webSocketBaseUrl": "https://ws.acklo.app/ws",
      }
    `);
  });

  it("throws a descriptive error if required config values are not provided", () => {
    /* eslint-disable jest/no-conditional-expect, jest/no-try-expect */
    try {
      new ClientConfiguration({ accessToken: "abc-123" });
      // Make sure that we fail the test if we manage to instantiate ClientConfiguration
      // without any errors being thrown.
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(MissingRequiredConfigurationValuesError);
      expect(err).toMatchInlineSnapshot(
        `[Error: Missing required configuration properties]`
      );
      expect(err.humanReadableMessage).toMatchInlineSnapshot(
        `"Missing values for required configuration properties: [applicationName, environmentName]. Please make sure to either provide as arguments to the acklo() constructor function, or as environment variables."`
      );
    }
    /* eslint-enable jest/no-conditional-expect, jest/no-try-expect */
  });
});
