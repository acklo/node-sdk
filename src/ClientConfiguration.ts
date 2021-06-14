import { DEFAULT_PROFILE_NAME, ProfileName, RcFile } from "./RcFile";
import { Tags } from "./types";
import { MissingRequiredConfigurationValuesError } from "./Errors";

/**
 * Logging level for the SDK.
 *
 * A guideline for what kind of messages should be expected at each level is:
 *
 * - `off` - no logs.
 * - `error` - only errors get logged (e.g. failure to establish a connection to the acklo service).
 * - `warn` - warnings get logged (e.g. tried to access a config value that does not exist).
 * - `info` - informational messages get logged (e.g. successfully connected to the acklo service).
 * - `debug` - verbose debugging messages get logged (e.g. the SDK's has sent a heartbeat to the acklo service).
 */
export type LogLevel = "off" | "error" | "warn" | "info" | "debug";

/**
 * Properties for configuring an acklo client instance.
 *
 * @example
 * ```js
 * {
 *   applicationName: "my-web-service",
 *   environmentName: "development"
 * }
 * ```
 */
export interface ClientConfigurationProperties {
  /**
   * The SDK access token for your acklo workspace. This is used to authenticate
   * your application's access to your acklo workspace.
   *
   * This token should be treated as a secret, so please don't commit it to your
   * source code. Instead prefer injecting it via an environment variable.
   *
   * This can also be configured by setting the `ACKLO_ACCESS_TOKEN` environment
   * variable.
   */
  accessToken: string;

  /**
   * The name of your application. This is used to identify your application within
   * your acklo workspace.
   *
   * This value can also be configured by setting the `ACKLO_APPLICATION_NAME` environment
   * variable.
   */
  applicationName: string;

  /**
   * The name of your application's environment. This is used to identify which environment
   * your application is running in. Common environments are `local` (for local development),
   * `staging` (for a staging environment), and `production` (for a production environment).
   *
   * This value can also be configured by setting the `ACKLO_ENVIRONMENT_NAME` environment
   * variable.
   */
  environmentName: string;

  /**
   * The log level that the acklo SDK should use.
   *
   * Possible values are `off`, `error`, `info`, `debug`.
   *
   * A guideline for what kind of messages should be expected at each level is:
   *
   * - `off` - no logs.
   * - `error` - only errors get logged (e.g. failure to establish a connection to the acklo service).
   * - `info` - informational messages get logged (e.g. successfully connected to the acklo service).
   * - `debug` - verbose debugging messages get logged (e.g. the SDK's has sent a heartbeat to the acklo service).
   *
   * This value can also be configured by setting the `ACKLO_LOG_LEVEL` environment variable.
   *
   * @default info
   */
  logLevel: LogLevel;

  /**
   * Tags to assign to this instance of your application. These are useful when you want to use the
   * acklo dashboard to differentiate between different instances of your application running in the same
   * environment.
   *
   * @default {}
   */
  tags: Tags;

  /**
   * Set to `true` to automatically add some useful tags to your instance (e.g. the hostname of the
   * server your instance is running on, as returned by `os.hostname()`).
   *
   * @default true
   */
  autoTags: boolean;

  /**
   * The name of the locally stored profile to use for authenticating to acklo.
   *
   * Note: this property is not yet generally available for use.
   *
   * This value can also be configured by setting the `ACKLO_PROFILE` environment variable.
   *
   * @private
   */
  profile: ProfileName;
}

export class ClientConfiguration {
  readonly profile: ProfileName;
  readonly accessToken: string;
  readonly applicationName: string;
  readonly environmentName: string;
  readonly logLevel: LogLevel;
  readonly tags: Tags;
  readonly autoTags: boolean;

  readonly apiBaseUrl: string;
  readonly webSocketBaseUrl: string;
  readonly heartbeatInterval: number;

  constructor(
    config: Partial<ClientConfigurationProperties>,
    environment: { [key: string]: string | undefined } = {},
    rcFile = new RcFile()
  ) {
    const configErrors: string[] = [];

    this.profile =
      environment["ACKLO_PROFILE"] || config.profile || DEFAULT_PROFILE_NAME;

    const profile = rcFile.profile(this.profile);

    const accessToken =
      environment["ACKLO_ACCESS_TOKEN"] ||
      config.accessToken ||
      profile?.accessToken;
    accessToken
      ? (this.accessToken = accessToken)
      : configErrors.push("accessToken");

    const applicationName =
      environment["ACKLO_APPLICATION_NAME"] || config.applicationName;
    applicationName
      ? (this.applicationName = applicationName)
      : configErrors.push("applicationName");

    const environmentName =
      environment["ACKLO_ENVIRONMENT_NAME"] || config.environmentName;
    environmentName
      ? (this.environmentName = environmentName)
      : configErrors.push("environmentName");

    this.apiBaseUrl =
      environment["ACKLO_API_BASE_URL"] || "https://acklo.app/api";

    this.webSocketBaseUrl =
      environment["ACKLO_WEBSOCKET_BASE_URL"] || "https://ws.acklo.app/ws";

    this.heartbeatInterval =
      parseInt(environment["ACKLO_HEARTBEAT_INTERVAL"] || "0", 10) || 60_000;

    const envLogLevel = environment["ACKLO_LOG_LEVEL"]?.toLowerCase();
    this.logLevel = isLogLevel(envLogLevel)
      ? envLogLevel
      : config.logLevel || "info";

    this.tags = config.tags || {};
    this.autoTags = config.autoTags || true;

    if (configErrors.length) {
      throw new MissingRequiredConfigurationValuesError(configErrors);
    }
  }
}

export function isLogLevel(thing: unknown): thing is LogLevel {
  if (typeof thing === "string") {
    return ["off", "error", "info", "debug"].includes(thing);
  }
  return false;
}
