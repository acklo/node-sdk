/**
 * A client for interacting with acklo. This is the main entrypoint to the acklo SDK.
 *
 * For extended documentation and getting started guides, check out
 * [acklo docs](https://acklo.app/docs).
 *
 * @example
 * ```js
 * // Create a new instance
 * const acklo = new AckloClient({
 *   applicationName: "my-app",
 *   environmentName: "local",
 *   accessToken: "acklo-123"
 * });
 *
 * // Connect to acklo
 * await acklo.connect();
 *
 * // Get a config value
 * acklo.get("config.port");
 * ```
 */
import { ApiClient } from "./ApiClient";
import {
  ClientConfiguration,
  ClientConfigurationProperties,
} from "./ClientConfiguration";
import {
  ConfigTemplateFile,
  ConfigTemplateEventKind,
  ConfigTemplateValues,
  ConfigTemplateValuesRaw,
  ConfigTemplateValueType,
  ConfigTemplateValueUpdates,
} from "./configTemplateFile/ConfigTemplateFile";
import { HeartbeatSender, HeartbeatSenderEvents } from "./HeartbeatSender";
import { ApiInstanceResponse } from "./types";
import { logger, configureGlobalLoggerInstance } from "./Logger";
import Backoff from "backo2";
import { delay } from "./utils";
import { WebSocketConnection } from "./WebSocketConnection";
import { CommandExecutionHandler } from "./handlers/CommandExecutionHandler";
import { AutoTagger } from "./AutoTagger";
import {
  ConnectionError,
  HumanReadableError,
  isHumanReadableError,
} from "./Errors";
import readConfigTemplateFile from "./configTemplateFile/readConfigTemplateFile";

type ClientState = "disconnected" | "connected";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageVersion = require("../package.json").version;

/**
 * An instance of the acklo client, which can be used for connecting to acklo,
 * retrieving remote configuration for your app, and adding listeners for live updates to
 * your app's configuration.
 *
 * For extended documentation and getting started guides, check out
 * [acklo docs](https://acklo.app/docs).
 *
 * @example
 * ```js
 * // Create a new instance
 * const acklo = new AckloClient({
 *   applicationName: "my-app",
 *   environmentName: "local",
 *   accessToken: "acklo-123"
 * });
 *
 * // Connect to acklo
 * await acklo.connect();
 *
 * // Get a config value
 * acklo.get("config.port");
 * ```
 */
export class AckloClient {
  private readonly apiClient: ApiClient;
  private readonly configTemplate: ConfigTemplateFile;
  private heartbeatSender: HeartbeatSender | null = null;
  private clientConfiguration: ClientConfiguration;
  private instance: ApiInstanceResponse | null = null;
  private webSocketConnection: WebSocketConnection | null = null;
  private state: ClientState = "disconnected";

  /**
   * Create an instance of the acklo client.
   *
   * Once the instance has been created you will be able to get configuration values for
   * your application, however these will _not_ be the latest values configured on the acklo
   * dashboard. In order to get the latest values you'll first need to connect to acklo by
   * calling {@link connect} on your instance.
   *
   * Most of the properties used to configure the instance can also be set as environment
   * variables. There are more details on this in the {@link ClientConfigurationProperties} docs.
   *
   * @example
   * ```js
   * // Create the instance
   * const acklo = new AckloClient({
   *   applicationName: "my-app",
   *   environmentName: "local",
   *   accessToken: "acklo-123"
   * });
   *
   * // This will be the default port configured in your acklo configuration file.
   * acklo.get('config.port_number');
   *
   * // Connect to acklo...
   * await acklo.connect()
   *
   * // Now that you've established a connection to acklo, this will be the latest value
   * // for `config.port_number` as configured on the acklo dashboard.
   * acklo.get('config.port_number');
   * ```
   *
   * @param {ClientConfigurationProperties} properties
   * @throws {@link MissingRequiredConfigurationValuesError} when a required configuration property is missing.
   * @throws {@link MissingConfigTemplateFile} when the acklo config template file could not be found.
   * @throws {@link InvalidConfigTemplateFile} when the acklo config template file is invalid.
   */
  constructor(properties: Partial<ClientConfigurationProperties>) {
    this.clientConfiguration = new ClientConfiguration(properties, process.env);
    configureGlobalLoggerInstance(this.clientConfiguration.logLevel);

    this.apiClient = new ApiClient(
      this.clientConfiguration.accessToken,
      this.clientConfiguration.apiBaseUrl
    );

    try {
      const rawConfigTemplate = readConfigTemplateFile();
      this.configTemplate = new ConfigTemplateFile(rawConfigTemplate);
    } catch (err) {
      this.exitWithError(err, "Failed to read config template file");
    }
  }

  /**
   * Establish a connection to acklo.
   *
   * Once the connection has been established you'll be able to get the latest configuration values
   * from the acklo dashboard and set up listeners so you get notified the instant that a configuration
   * value changes.
   *
   * @example
   * ```js
   * // Using async/await
   * const acklo = await new AckloClient({
   *   applicationName: "my-app",
   *   environmentName: "local",
   *   accessToken: "acklo-123"
   * }).connect();
   *
   * // Using promises
   * const acklo =
   *   new AckloClient({
   *     applicationName: "my-app",
   *     environmentName: "local",
   *     accessToken: "acklo-123"
   *   })
   *  .connect()
   *  .then(() => console.log("Connected successfully"))
   *  .catch(err => console.error("Failed to connect", err));
   *  ```
   *
   * @throws {@link ConnectionError} for any connection errors if you have set
   *   the `continueAfterConnectionError` option to `true`.
   * @returns {Promise<AckloClient>}
   * @param {Object} [options]
   * @param {boolean} [options.continueAfterConnectionError = true] - whether to continue execution without throwing
   *   after an error in connecting to acklo has occurred. Default is `true`.
   */
  async connect(
    options: {
      /**
       * Whether to continue execution without throwing after an error in conencting to acklo has occurred.
       * Default is `true`.
       */
      continueAfterConnectionError: boolean;
    } = {
      continueAfterConnectionError: true,
    }
  ): Promise<AckloClient> {
    if (this.state === "connected") {
      return this;
    }

    try {
      const autoTags = this.clientConfiguration.autoTags
        ? new AutoTagger().tags()
        : {};

      this.instance = await this.apiClient.createInstance(
        this.clientConfiguration.applicationName,
        this.clientConfiguration.environmentName,
        this.configTemplate.toJSON(),
        this.configTemplate.rawContent,
        packageVersion,
        { ...autoTags, ...this.clientConfiguration.tags }
      );

      this.configTemplate.updateValues(
        await this.apiClient.getInstanceConfiguration(this.instance.id)
      );

      this.heartbeatSender = new HeartbeatSender(
        this.instance.id,
        this.apiClient,
        this.clientConfiguration.heartbeatInterval
      ).start();

      this.heartbeatSender.events.on(
        HeartbeatSenderEvents.HeartbeatFailed,
        () =>
          this.reconnect().catch(() => {
            throw new HumanReadableError("Failed to reconnect to acklo.");
          })
      );

      this.webSocketConnection = new WebSocketConnection(
        this.clientConfiguration.webSocketBaseUrl
      );
      this.webSocketConnection.addHandler(
        new CommandExecutionHandler(this.configTemplate, this.apiClient)
      );
      await this.webSocketConnection.connect(this.instance.id);

      this.state = "connected";

      logger.info("Connected to acklo!", {
        instanceName: this.getInstanceName(),
        instanceUrl: this.getInstanceUrl(),
        configuration: this.getConfig(),
      });
    } catch (err) {
      const connectionError = new ConnectionError(err);
      if (options.continueAfterConnectionError) {
        logger.error(connectionError.humanReadableMessage);
        logger.debug("%o", err);
      } else {
        this.exitWithError(err, "Failed to connect");
      }
    }

    return this;
  }

  /**
   * Disconnect from acklo.
   *
   * Once you've disconnected you will no longer receive configuration updates
   * from acklo. It's recommended that you call this method when your application is shutting down
   * (e.g. when it receives `SIGTERM`) in order to gracefully close any open sockets the acklo client
   * has established.
   *
   * @example
   * ```js
   * const acklo = await new AckloClient({
   *   applicationName: "my-app",
   *   environmentName: "local",
   *   accessToken: "acklo-123"
   * }).connect();
   *
   * await acklo.disconnect();
   * ```
   *
   * @returns {Promise<AckloClient>}
   */
  async disconnect(): Promise<AckloClient> {
    if (this.state === "disconnected") {
      return this;
    }

    this.heartbeatSender?.stop();
    this.webSocketConnection?.disconnect();

    if (this.instance) {
      this.instance = null;
    }

    this.state = "disconnected";

    return this;
  }

  /**
   * Returns the name of this application instance as displayed on the acklo dashboard.
   *
   * This will only return a value once the client has been successfully connected to acklo by
   * using the {@link connect} method.
   *
   * The instance name is randomly generated by acklo and is a combination of some recognizable
   * words and random characters.
   *
   * @example
   * ```js
   * acklo.getInstanceName();
   * ```
   *
   * Returns:
   *
   * ```js
   * "ins-delicate-feather-qpcw"
   * ```
   *
   * @returns {string | undefined}
   */
  getInstanceName(): string | undefined {
    return this.instance?.name;
  }

  /**
   * Returns the URL at which you can see this instance on the acklo dashboard.
   *
   * This will only return a value once the client has been successfully connected to acklo by
   * using the {@link connect} method.
   *
   * @example
   * ```js
   * acklo.getInstanceUrl()
   * ```
   *
   * Returns:
   *
   * ```js
   * "https://acklo.app/dashboard/applications/my-app/local/instances/a438372d-2dba-46dc-ada2-3ae043e2c8c3"
   * ```
   *
   * @returns {string | undefined}
   */
  getInstanceUrl(): string | undefined {
    return this.instance?.url;
  }

  /**
   * Returns the latest config for your application.
   *
   * This will return the default values specified in your acklo configuration file (`acklo.config.yml`) until
   * the client has been successfully connected to acklo by using the {@link connect} method.
   *
   * @example
   * ```js
   * acklo.getConfig();
   * ```
   *
   * Returns:
   *
   * ```js
   * {
   *   "config.port": 3000,
   *   "config.greeting": "Howdy, partner",
   *   "feature_switch.new_homepage": true
   * }
   * ```
   *
   * @returns {ConfigTemplateValues}
   */
  getConfig(): ConfigTemplateValues {
    return this.configTemplate.values();
  }

  /**
   * Returns the latest config for your application, but unlike {@link getConfig} does not try to coerce
   * the values stored on the acklo backend to native Javascript types (i.e. booleans, numbers, etc). Instead
   * it returns all values as strings and lets you do your own coercion.
   *
   * Unless you have a good reason to use this method, you probably want {@link getConfig} instead.
   *
   * This will return the default values specified in your acklo configuration file (`acklo.config.yml`) until
   * the client has been successfully connected to acklo by using the {@link connect} method.
   *
   * @example
   * ```js
   * acklo.getConfigRaw();
   * ```
   *
   * Returns:
   *
   * ```js
   * {
   *   "config.port": "3000",
   *   "config.greeting": "Howdy, partner",
   *   "feature_switch.new_homepage": "true"
   * }
   * ```
   *
   * @returns {ConfigTemplateValuesRaw}
   */
  getConfigRaw(): ConfigTemplateValuesRaw {
    return this.configTemplate.valuesRaw();
  }

  /**
   * Returns the latest config value for the given property.
   *
   * This will return the default values specified in your acklo configuration file (`acklo.config.yml`) until
   * the client has been successfully connected to acklo by using the {@link connect} method.
   *
   * `undefined` will be returned if you try to get a value for a config property that does not exist.
   *
   * @example
   * ```js
   * acklo.get("config.port");
   * ```
   *
   * Returns:
   *
   * ```js
   * 3000
   * ```
   *
   * @param {string} id - the ID of the config value you want to get (e.g. `"config.port"`)
   * @returns {ConfigTemplateValueType}
   */
  get(id: string): ConfigTemplateValueType {
    const value = this.getConfig()[id];

    if (value === undefined) {
      logger.warn("Tried to get undefined config property", { id });
    }

    return value;
  }

  /**
   * Returns the latest config value for the given property, but unlike {@link get} does not try to coerce
   * the values stored on the acklo backend to native JavaScript types (i.e. booleans, numbers, etc). Instead
   * it returns all values as strings and lets you do your own coercion.
   *
   * Unless you have a good reason to use this method, you probably want {@link get} instead.
   *
   * This will return the default values specified in your acklo configuration file (`acklo.config.yml`) until
   * the client has been successfully connected to acklo by using the {@link connect} method.
   *
   * `undefined` will be returned if you try to get a value for a config property that does not exist.
   *
   * @example
   * ```js
   * acklo.get("config.port");
   * ```
   *
   * Returns:
   *
   * ```js
   * "3000"
   * ```
   *
   * @param id
   */
  getRaw(id: string): string | undefined {
    return this.getConfigRaw()[id];
  }

  /**
   * Registers the given callback to run as soon as an update is made to this application's config. This
   * allows you to react immediately to configuration changes without needing to poll the {@link get} method.
   *
   * @example
   * ```js
   * // Where "config.port" has been updated to 4000.
   * acklo.onConfigUpdate(updates => {
   *   console.log(`my new port is: ${updates["config.port"].newValue}`);
   *   // Prints
   *   // my new port is: 4000
   * });
   * ```
   *
   * @param callback
   */
  onConfigUpdate(
    callback: (updates: ConfigTemplateValueUpdates) => void
  ): void {
    this.configTemplate.events.on(
      ConfigTemplateEventKind.ConfigUpdate,
      callback
    );
  }

  private async reconnect(): Promise<AckloClient> {
    await this.disconnect();

    const backoff = new Backoff({
      min: 500,
      max: 10_000,
      jitter: 200,
      factor: 1.5,
    });

    while (this.state === "disconnected") {
      logger.info("Attempting to reconnect to acklo...");
      await this.connect();
      await delay(backoff.duration());
    }

    return this;
  }

  /**
   * Exits the process because an unrecoverable error has happened.
   *
   * @private
   */
  private exitWithError(error: Error, message: string): void {
    if (isHumanReadableError(error)) {
      logger.error(error.humanReadableMessage);
      logger.debug("Error details", { error });
    } else {
      logger.error(message, { error });
    }

    process.exit(1);
  }
}
