/**
 * A generic error which has a friendly human readable message suitable to
 * help a developer figure out what went wrong.
 *
 * Any errors which end up being presented to developers should derive
 * from this class.
 */
export class HumanReadableError extends Error {
  /**
   * A helpful message describing the error, suitable for displaying to developers
   * integrating with acklo.
   */
  readonly humanReadableMessage: string;
  /**
   * The underlying error that this error is wrapping, if any.
   */
  readonly underlyingError?: Error;

  constructor(
    message: string,
    humanReadableMessage?: string,
    underlyingError?: Error
  ) {
    super(message);
    this.humanReadableMessage = humanReadableMessage || message;
    this.underlyingError = underlyingError;
  }
}

/**
 * A required configuration value was not provided when initializing acklo.
 *
 * Check out {@link ClientConfigurationProperties} for info on which properties
 * must be provided.
 */
export class MissingRequiredConfigurationValuesError extends HumanReadableError {
  constructor(missingProps: string[]) {
    const humanReadableMessage =
      `Missing values for required configuration properties: [${missingProps.join(
        ", "
      )}]. ` +
      `Please make sure to either provide as arguments to the acklo() constructor function, or as environment ` +
      `variables.`;

    super("Missing required configuration properties", humanReadableMessage);
    Object.setPrototypeOf(
      this,
      MissingRequiredConfigurationValuesError.prototype
    );
  }
}

/**
 * Failed to connect to acklo. This is usually due to an invalid SDK access token
 * being provided.
 */
export class ConnectionError extends HumanReadableError {
  constructor(underlyingError?: Error) {
    // If the ConnectionError comes from the ApiClient, it'll come through as
    // a HumanReadableError where the message has been provided by the server.
    const humanReadableMessage = isHumanReadableError(underlyingError)
      ? underlyingError.humanReadableMessage
      : undefined;

    super(
      "Failed to establish a connection to acklo",
      humanReadableMessage,
      underlyingError
    );
    Object.setPrototypeOf(this, ConnectionError.prototype);
  }
}

/**
 * @private
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export function isHumanReadableError(thing: any): thing is HumanReadableError {
  return typeof thing?.humanReadableMessage === "string";
}

/**
 * Received an unexpected response from the acklo API.
 */
export class InvalidResponseError extends HumanReadableError {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, InvalidResponseError.prototype);
  }
}

/**
 * Failed to send a heartbeat to the acklo servers.
 */
export class HeartbeatFailedError extends HumanReadableError {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, HeartbeatFailedError.prototype);
  }
}

/**
 * @private
 */
export class SetupTokenCannotBeRedeemedError extends HumanReadableError {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, SetupTokenCannotBeRedeemedError.prototype);
  }
}

/**
 * The acklo config template file (acklo.config.yml) could not be found on the file system.
 */
export class MissingConfigTemplateFile extends HumanReadableError {
  constructor() {
    const humanReadableMessage = `The acklo config template file (acklo.config.yml) could not be found.

Please make sure that the file has been created and is in the root of your project.`;
    super("Could not find acklo config template file", humanReadableMessage);
    Object.setPrototypeOf(this, MissingConfigTemplateFile.prototype);
  }
}

/**
 * The contents of the acklo config template file (acklo.config.yml) could not be parsed.
 *
 * The underlying error is provided by quicktype, however it's not detailed enough to use in
 * a user-facing error message, so it's hidden.
 */
export class InvalidConfigTemplateFile extends HumanReadableError {
  constructor(underlyingError: Error) {
    const humanReadableMessage = `The contents of the acklo config template file (acklo.config.yml) could not be parsed.
    
Check the ConfigTemplate docs and make sure that your template matches the expected format:
https://acklo.app/docs/nodejs_sdk/modules/configtemplate.html`;
    super(
      "Invalid acklo config template file",
      humanReadableMessage,
      underlyingError
    );
    Object.setPrototypeOf(this, InvalidConfigTemplateFile.prototype);
  }
}
