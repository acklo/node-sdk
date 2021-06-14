import {
  ConfigTemplate,
  Convert,
  Property,
  Type,
} from "../quicktype/ConfigTemplate";
import { logger } from "../Logger";
import { EventEmitter } from "events";
import { InvalidConfigTemplateFile } from "../Errors";
import YAML from "yaml";

export type ConfigTemplateValueType = string | number | boolean | undefined;

export interface ConfigTemplateValues {
  [key: string]: ConfigTemplateValueType;
}

export interface ConfigTemplateValuesRaw {
  [key: string]: string;
}

export enum ConfigTemplateEventKind {
  ConfigUpdate = "ConfigUpdate",
}

export interface ConfigTemplateValueUpdates {
  [key: string]: {
    oldValue: ConfigTemplateValueType | undefined;
    newValue: ConfigTemplateValueType;
  };
}

export class ConfigTemplateFile {
  readonly content: ConfigTemplate;
  readonly events = new EventEmitter();

  /**
   * Contents of the config template file as it is on disk without being parsed
   * by anything.
   */
  readonly rawContent: string;

  private currentValues: ConfigTemplateValuesRaw = {};

  constructor(yamlString: string) {
    try {
      this.rawContent = yamlString;
      const jsonString = JSON.stringify(YAML.parse(yamlString));
      this.content = Convert.toConfigTemplate(jsonString);
    } catch (err) {
      throw new InvalidConfigTemplateFile(err);
    }
  }

  toJSON(): string {
    return Convert.configTemplateToJson(this.content);
  }

  values(): ConfigTemplateValues {
    const raw = this.valuesRaw();
    const values: ConfigTemplateValues = {};

    for (const [key, val] of Object.entries(raw)) {
      const property = this.findProperty(key);
      values[key] = rawToValue(val, property?.type);
    }

    return values;
  }

  valuesRaw(): ConfigTemplateValuesRaw {
    if (!this.content.configuration) {
      return {};
    }

    return { ...this.defaults(), ...this.currentValues };
  }

  updateValues(newValues: ConfigTemplateValuesRaw): ConfigTemplateValueUpdates {
    logger.debug("Updating ConfigTemplate with new values: %o", newValues);

    const updatableValues: ConfigTemplateValuesRaw = {};

    for (const [key, val] of Object.entries(newValues)) {
      if (this.findProperty(key)) {
        updatableValues[key] = val;
      }
    }

    const oldValues = { ...this.currentValues };
    this.currentValues = { ...this.currentValues, ...updatableValues };

    const updates = this.updatedValues(oldValues, updatableValues);

    if (Object.keys(updates).length > 0) {
      this.events.emit(ConfigTemplateEventKind.ConfigUpdate, updates);
    }

    return updates;
  }

  private defaults(): ConfigTemplateValuesRaw {
    if (!this.content.configuration) {
      return {};
    }

    return this.content.configuration.reduce(
      (acc, configItem) => ({
        ...acc,
        ...configItem.properties?.reduce(
          (acc2, prop) => ({
            ...acc2,
            [`${configItem.id}.${prop.id}`]: valueToRaw(prop.default),
          }),
          {}
        ),
      }),
      {}
    );
  }

  private findProperty(fqid: string): Property | undefined {
    const [groupId, propId] = fqid.split(".");
    return this.content.configuration
      ?.find((c) => c.id === groupId)
      ?.properties?.find((p) => p.id === propId);
  }

  private updatedValues(
    oldValues: ConfigTemplateValuesRaw,
    newValues: ConfigTemplateValuesRaw
  ): ConfigTemplateValueUpdates {
    const updates: ConfigTemplateValueUpdates = {};

    for (const updatedValueName in newValues) {
      const property = this.findProperty(updatedValueName);

      if (oldValues[updatedValueName] !== newValues[updatedValueName]) {
        updates[updatedValueName] = {
          oldValue: rawToValue(oldValues[updatedValueName], property?.type),
          newValue: rawToValue(newValues[updatedValueName], property?.type),
        };
      }
    }

    return updates;
  }
}

function valueToRaw(val: string | number | boolean | null): string | undefined {
  if (val) {
    return val.toString();
  } else {
    return undefined;
  }
}

function rawToValue(
  val: string,
  type: Type | undefined
): ConfigTemplateValueType {
  if (type === undefined) {
    return val;
  }

  switch (type) {
    case Type.Boolean:
      return val === "true";
    case Type.String:
      return val;
    case Type.Number:
      return parseFloat(val);
  }
}
