import { CommandExecutionMessage, MessageHandler, MessageKind } from "../types";
import { ApiClient } from "../ApiClient";
import { ConfigTemplateFile } from "../configTemplateFile/ConfigTemplateFile";
import { logger } from "../Logger";

export class CommandExecutionHandler
  implements MessageHandler<CommandExecutionMessage>
{
  kind = MessageKind.CommandExecution;

  constructor(
    private readonly configTemplate: ConfigTemplateFile,
    private readonly apiClient: ApiClient
  ) {}

  async handle(message: CommandExecutionMessage): Promise<void> {
    if (message.command.kind === "config_update") {
      const updates = this.configTemplate.updateValues(
        await this.apiClient.getInstanceConfiguration(message.instanceId)
      );

      if (Object.keys(updates).length > 0) {
        logger.info("Received a config update", { updates });
      }
    }
  }
}
