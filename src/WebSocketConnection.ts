import WebSocket from "ws";
import Backoff from "backo2";
import { logger } from "./Logger";
import { isMessage, Message, MessageHandler, MessageKind } from "./types";
import { MessageHandlerController } from "./MessageHandlerController";
import EventEmitter from "events";

const PING_INTERVAL_MS = 20_000;

export enum WebSocketConnectionEvents {
  Connected = "Connected",
  Error = "Error",
  Closed = "Closed",
}

export class WebSocketConnection {
  events = new EventEmitter();

  private instanceId: string | null;
  private ws: WebSocket | null;
  private pingTimer: NodeJS.Timeout;
  private reconnectionScheduled = false;
  private reconnectTimer: NodeJS.Timeout;
  private reconnectBackoff: Backoff;
  private shouldTryToReconnect = true;

  constructor(
    private readonly websocketEndpointBase: string,
    private readonly messageHandlerController = new MessageHandlerController()
  ) {
    this.reconnectBackoff = new Backoff({
      min: 3_000,
      max: 30_000,
      factor: 1.25,
      jitter: 100,
    });
  }

  async connect(instanceId: string): Promise<this> {
    return new Promise<this>((resolve, reject) => {
      const onError = (err: Error) => reject(err);
      this.events.once(WebSocketConnectionEvents.Error, onError);
      this.events.once(WebSocketConnectionEvents.Connected, () => {
        this.events.off(WebSocketConnectionEvents.Error, onError);
        resolve(this);
      });

      this.doConnect(instanceId);
    });
  }

  disconnect(): void {
    logger.debug("Disconnecting WebSocket");

    this.shouldTryToReconnect = false;
    this.reconnectionScheduled = false;
    this.reconnectBackoff.reset();
    clearTimeout(this.pingTimer);
    clearTimeout(this.reconnectTimer);

    this.ws?.close();
    this.ws = null;
  }

  async send(message: Message): Promise<void> {
    logger.debug("Sending message", { message });

    return new Promise<void>((resolve, reject) => {
      if (!this.ws) {
        reject(
          new Error("Tried to send a message before establishing connection")
        );
        return;
      }

      this.ws.send(JSON.stringify(message), (err) => {
        if (err) {
          // TODO: Save to a buffer and try to send once reconnection
          // reestablished?
          logger.debug("Error sending message", { err });
          this.scheduleReconnection();
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  addHandler<T extends Message>(handler: MessageHandler<T>): void {
    this.messageHandlerController.addHandler(handler);
  }

  private doConnect(instanceId: string): this {
    this.instanceId = instanceId;

    const endpoint = `${this.websocketEndpointBase}/${instanceId}`;

    logger.debug("Opening WebSocket connection", {
      endpoint,
    });

    this.ws = new WebSocket(endpoint);

    this.ws.onopen = () => {
      logger.debug("WebSocket connection established");
      this.reconnectBackoff.reset();
      this.listenForMessages();
      this.schedulePing(true);
      this.events.emit(WebSocketConnectionEvents.Connected);
    };

    this.ws.onerror = (err) => {
      logger.error("WebSocket connection encountered an error", {
        err: err.message,
      });
      this.scheduleReconnection();
      this.events.emit(WebSocketConnectionEvents.Error, err);
    };

    this.ws.onclose = () => {
      logger.info("WebSocket connection was closed");
      this.scheduleReconnection();
      this.events.emit(WebSocketConnectionEvents.Closed);
    };

    return this;
  }

  private scheduleReconnection() {
    if (this.reconnectionScheduled || !this.shouldTryToReconnect) {
      return;
    }
    this.reconnectionScheduled = true;

    const timeoutDuration = this.reconnectBackoff.duration();

    logger.info("Scheduling reconnection attempt", { timeoutDuration });

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectionScheduled = false;
      if (this.instanceId) {
        this.doConnect(this.instanceId);
      }
    }, timeoutDuration);
  }

  private schedulePing(immediately = false) {
    clearTimeout(this.pingTimer);

    this.pingTimer = setTimeout(
      () => {
        if (!this.instanceId) {
          return;
        }

        this.send({ kind: MessageKind.Ping, instanceId: this.instanceId })
          .then(() => {
            this.schedulePing();
          })
          .catch((err) => {
            logger.error("Failed to send ping", { err });
            this.scheduleReconnection();
          });
      },
      immediately ? 0 : PING_INTERVAL_MS
    );
  }

  private listenForMessages() {
    if (!this.ws) {
      return;
    }

    this.ws.on("message", (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        logger.debug("Received message", { message: parsed });
        if (isMessage(parsed)) {
          this.messageHandlerController.handleMessage(parsed).catch((err) => {
            logger.error("Error handling message", { err });
          });
        }
      } catch (err) {
        logger.error("Error parsing websocket message", { err });
      }
    });
  }
}
