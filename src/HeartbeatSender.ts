import { ApiClient } from "./ApiClient";
import axios, { CancelTokenSource } from "axios";
import { logger } from "./Logger";
import { EventEmitter } from "events";
import { HeartbeatFailedError } from "./Errors";

export enum HeartbeatSenderEvents {
  HeartbeatFailed = "HeartbeatFailed",
}

export class HeartbeatSender {
  private timer: NodeJS.Timeout | null = null;
  private cancelTokenSource: CancelTokenSource | null = null;
  private state: "stopped" | "started" = "stopped";

  events = new EventEmitter();

  constructor(
    private readonly applicationKey: string,
    private readonly instanceId: string,
    private readonly apiClient: ApiClient,
    private readonly heartbeatInterval: number
  ) {}

  start(): this {
    if (this.state === "started") {
      return this;
    }

    logger.debug("Starting heartbeat every %sms", this.heartbeatInterval);
    this.heartbeat();
    this.state = "started";

    return this;
  }

  stop(): this {
    if (this.state === "stopped") {
      return this;
    }

    logger.debug("Stopping heartbeat");

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.cancelTokenSource) {
      this.cancelTokenSource.cancel();
      this.cancelTokenSource = null;
    }

    this.events.removeAllListeners();

    this.state = "stopped";

    return this;
  }

  private heartbeat() {
    this.cancelTokenSource = axios.CancelToken.source();

    this.apiClient
      .sendInstanceHeartbeatWithRetries(this.applicationKey, this.instanceId, {
        cancelToken: this.cancelTokenSource.token,
      })
      .catch((err) => {
        if (err instanceof HeartbeatFailedError) {
          this.events.emit(HeartbeatSenderEvents.HeartbeatFailed);
        }
      })
      .finally(() => {
        if (this.state === "stopped") {
          return;
        }
        this.timer = setTimeout(() => this.heartbeat(), this.heartbeatInterval);
        this.cancelTokenSource = null;
      });
  }
}
