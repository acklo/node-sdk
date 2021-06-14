export type Tags = Record<string, string | null | boolean | number | undefined>;

export interface ApiInstanceResponse {
  id: string;
  name: string;
  url: string;
}

export interface ApiCreateInstance {
  application_name: string;
  environment_name: string;
  raw_config_template_content: string;
  config_template_content: string;
  config_template_content_type: "application/json";
  sdk_name: "node-sdk";
  sdk_version: string;
  tags: Tags;
}

export interface ApiCreateSetupTokenRequest {
  requester_name: string;
}

export interface ApiCreateSetupTokenResponse {
  id: string;
  activate_url: string;
}

export interface ApiRedeemSetupTokenResponse {
  prefix: string;
  key: string;
}

export interface AccessToken {
  prefix: string;
  key: string;
}

export interface SetupToken {
  id: string;
  activateUrl: string;
}

export enum MessageKind {
  CommandExecution = "command_execution",
  Ping = "ping",
  Pong = "pong",
}

export interface Message {
  kind: MessageKind;
  instanceId: string;
}

export interface CommandExecutionMessage extends Message {
  kind: MessageKind.CommandExecution;
  environmentId: string;
  instanceId: string;
  commandExecutionId: string;
  command: {
    kind: "custom" | "config_update";
    details: Record<string, unknown>;
  };
}

export interface PingMessage extends Message {
  kind: MessageKind.Ping;
  instanceId: string;
}

export interface PongMessage extends Message {
  kind: MessageKind.Pong;
  instanceId: string;
}

export interface MessageHandler<T extends Message> {
  kind: MessageKind;
  handle: (message: T) => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function isMessage(thing: any): thing is Message {
  if (typeof thing !== "object" || thing === null) {
    return false;
  }
  return thing.kind !== undefined && thing.instanceId !== undefined;
}
