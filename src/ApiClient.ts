import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  CancelToken,
} from "axios";
import Backoff from "backo2";
import { ConfigTemplateValuesRaw } from "./configTemplateFile/ConfigTemplateFile";
import {
  AccessToken,
  ApiCreateInstance,
  ApiCreateSetupTokenRequest,
  ApiCreateSetupTokenResponse,
  ApiInstanceResponse,
  ApiRedeemSetupTokenResponse,
  SetupToken,
  Tags,
} from "./types";
import { delay } from "./utils";
import { logger } from "./Logger";
import {
  HeartbeatFailedError,
  HumanReadableError,
  InvalidResponseError,
  SetupTokenCannotBeRedeemedError,
} from "./Errors";

export const SETUP_TOKEN_EXPIRY_MINUTES = 10;

export class ApiClient {
  private readonly client: AxiosInstance;

  constructor(accessToken: string | undefined, baseURL: string) {
    const headers: Record<string, string> = {};

    if (accessToken) {
      headers["x-api-key"] = accessToken;
    }

    this.client = axios.create({
      baseURL,
      timeout: 5_000,
      headers,
    });

    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (originalError) => {
        let mappedError = originalError;

        if (isAxiosError(originalError)) {
          const errorDetails = originalError.response?.data?.error;
          const errorType = errorDetails?.type;
          if (errorType === "SetupToken::MustBeActivatedFirst") {
            return Promise.reject(
              new SetupTokenCannotBeRedeemedError(
                originalError.response?.data?.error?.message
              )
            );
          }

          if (errorDetails?.message) {
            mappedError = new HumanReadableError(
              errorDetails?.message,
              errorDetails?.message,
              originalError
            );
          }
        }

        return Promise.reject(mappedError);
      }
    );
  }

  async createInstance(
    applicationName: string,
    environmentName: string,
    configTemplateContent: string,
    rawConfigTemplateContent: string,
    version: string,
    tags: Tags = {}
  ): Promise<ApiInstanceResponse> {
    logger.debug("Creating instance %o", {
      applicationName,
      environmentName,
      rawConfigContentLength: rawConfigTemplateContent.length,
    });

    try {
      const body: ApiCreateInstance = {
        application_name: applicationName,
        environment_name: environmentName,
        raw_config_template_content: rawConfigTemplateContent,
        config_template_content_type: "application/json",
        config_template_content: configTemplateContent,
        sdk_name: "node-sdk",
        sdk_version: version,
        tags,
      };

      const res = await this.client.post<
        ApiCreateInstance,
        AxiosResponse<ApiInstanceResponse>
      >("/instances", body);

      this.ensureAttributeExists(res.data, "id");
      this.ensureAttributeExists(res.data, "name");
      this.ensureAttributeExists(res.data, "url");

      return res.data;
    } catch (err) {
      handleApiError(err, `Unable to create instance`);
    }
  }

  async getInstanceConfiguration(
    instanceId: string
  ): Promise<ConfigTemplateValuesRaw> {
    logger.debug("Getting configuration for instance with id: %s", instanceId);

    try {
      return (await this.client.get(`/instances/${instanceId}/configuration`))
        .data.configuration;
    } catch (err) {
      handleApiError(
        err,
        `Unable to get instance configuration: ${err.message}`
      );
    }
  }

  async sendInstanceHeartbeat(
    instanceId: string,
    options?: { cancelToken?: CancelToken }
  ): Promise<void> {
    logger.debug("Sending heartbeat for instance with id: %s", instanceId);

    try {
      await this.client.post(`/instances/${instanceId}/heartbeat`, undefined, {
        cancelToken: options?.cancelToken,
      });
    } catch (err) {
      if (axios.isCancel(err)) {
        logger.debug(
          "cancelled request to send heartbeat for instance with id: %s",
          instanceId
        );
      } else {
        handleApiError(err, `Unable to send heartbeat`);
      }
    }
  }

  async createSetupToken(requesterName: string): Promise<SetupToken> {
    logger.debug("Creating setup token: %s", requesterName);
    const requestBody: ApiCreateSetupTokenRequest = {
      requester_name: requesterName,
    };
    try {
      const response = await this.client.post<ApiCreateSetupTokenResponse>(
        `/setup_tokens`,
        requestBody
      );
      return { id: response.data.id, activateUrl: response.data.activate_url };
    } catch (err) {
      handleApiError(err, "Unable to create setup token");
    }
  }

  async redeemSetupTokenWithRetries(
    id: string,
    tokenExpiryMinutes = SETUP_TOKEN_EXPIRY_MINUTES,
    delayBetweenRequestsSeconds = 3,
    firstRequestAt = new Date(),
    currentTime = new Date()
  ): Promise<AccessToken> {
    logger.debug("Redeeming setup token: %s", id);

    try {
      const response = await this.client.get<ApiRedeemSetupTokenResponse>(
        `/setup_tokens/${id}/redeem`
      );
      return response.data;
    } catch (err) {
      if (err instanceof SetupTokenCannotBeRedeemedError) {
        const tokenExpiresAt =
          firstRequestAt.getTime() + tokenExpiryMinutes * 60 * 1_000;
        const now = currentTime.getTime();

        if (tokenExpiresAt > now) {
          await delay(delayBetweenRequestsSeconds * 1000);

          return this.redeemSetupTokenWithRetries(
            id,
            tokenExpiryMinutes,
            delayBetweenRequestsSeconds,
            firstRequestAt,
            new Date()
          );
        }
      }

      handleApiError(err, "Unable to redeem setup token");
    }
  }

  async sendInstanceHeartbeatWithRetries(
    instanceId: string,
    options?: { cancelToken?: CancelToken },
    backoff?: Backoff
  ): Promise<void> {
    try {
      return await this.sendInstanceHeartbeat(instanceId, options);
    } catch (err) {
      const maxRetryAttempts = 10;

      backoff =
        backoff ||
        new Backoff({
          min: 1_000,
          max: 10_000,
          jitter: 200,
          factor: 1.5,
        });

      if (backoff.attempts >= maxRetryAttempts) {
        throw new HeartbeatFailedError(
          "Failed to perform a heartbeat to the acklo servers after several attempts."
        );
      }

      const duration = backoff.duration();
      logger.debug(
        "Retrying heartbeat in %sms (attempt %d/%d)",
        duration,
        backoff.attempts,
        maxRetryAttempts
      );
      await delay(duration);

      return await this.sendInstanceHeartbeatWithRetries(
        instanceId,
        options,
        backoff
      );
    }
  }

  private ensureAttributeExists<T>(obj: T, attrName: keyof T): void {
    if (obj[attrName] === undefined) {
      throw new InvalidResponseError(
        `Expected response from acklo API to include a "${attrName}" attribute`
      );
    }
  }
}

function handleApiError(err: unknown, fallbackMessage: string): never {
  if (err instanceof HumanReadableError) {
    throw err;
  } else {
    if (isAxiosError(err) && err.response === undefined) {
      logger.debug(
        "Could not get a response from the backend, this could be because acklo servers are offline " +
          "or cannot be reached from your network."
      );
    } else {
      logger.debug("Unhandled API error: %o", err);
    }
    throw new HumanReadableError(fallbackMessage);
  }
}

function isAxiosError(error: unknown): error is AxiosError {
  return (error as AxiosError).isAxiosError !== undefined;
}
