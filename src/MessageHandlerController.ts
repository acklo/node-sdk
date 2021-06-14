import { Message, MessageHandler, MessageKind } from "./types";
import { logger } from "./Logger";

export class MessageHandlerController {
  private handlers = new Map<MessageKind, MessageHandler<Message>[]>();

  async handleMessage(message: Message): Promise<void> {
    const handlers = this.handlers.get(message.kind) || [];

    logger.debug("Handling message", {
      message,
      numberOfHandlers: handlers.length,
    });

    for (const handler of handlers) {
      await handler.handle(message);
    }
  }

  addHandler<T extends Message>(handler: MessageHandler<T>): void {
    if (!this.handlers.has(handler.kind)) {
      this.handlers.set(handler.kind, []);
    }
    this.handlers.get(handler.kind)?.push(handler);
  }
}
