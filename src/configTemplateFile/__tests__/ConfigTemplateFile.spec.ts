import fs from "fs";
import {
  ConfigTemplateFile,
  ConfigTemplateEventKind,
  ConfigTemplateValueUpdates,
} from "../ConfigTemplateFile";
import { delay } from "../../utils";

describe("ConfigTemplateFile", () => {
  let configTemplate: ConfigTemplateFile;

  beforeAll(() => {
    const yaml = fs
      .readFileSync(
        "./src/configTemplateFile/__tests__/configTemplateExample.yml"
      )
      .toString("utf-8");
    configTemplate = new ConfigTemplateFile(yaml);
  });

  it("converts json string to a ConfigTemplate", () => {
    expect(configTemplate.content).toMatchSnapshot();
  });

  it("returns the defaults from the json config when no other values are available", () => {
    expect(configTemplate.values()).toMatchInlineSnapshot(`
      Object {
        "app_config.log_level": "trace",
        "app_config.port": 3000,
        "feature_switches.motd": "Be good to each other.",
        "feature_switches.new_header": false,
      }
    `);
  });

  it("can update the config template's values", () => {
    expect(configTemplate.updateValues({})).toEqual({});

    configTemplate.updateValues({
      "app_config.log_level": "info",
      "feature_switches.motd": "Happy Monday!",
      "feature_switches.new_header": "true",
      "app_config.port": "3000",
    });

    expect(configTemplate.values()).toMatchInlineSnapshot(`
      Object {
        "app_config.log_level": "info",
        "app_config.port": 3000,
        "feature_switches.motd": "Happy Monday!",
        "feature_switches.new_header": true,
      }
    `);

    configTemplate.updateValues({
      "feature_switches.new_header": "false",
    });

    expect(configTemplate.values()).toMatchInlineSnapshot(`
      Object {
        "app_config.log_level": "info",
        "app_config.port": 3000,
        "feature_switches.motd": "Happy Monday!",
        "feature_switches.new_header": false,
      }
    `);
  });

  it("emits an event when updates come through", async () => {
    const updates: ConfigTemplateValueUpdates[] = [];
    configTemplate.events.on(ConfigTemplateEventKind.ConfigUpdate, (update) => {
      updates.push(update);
    });

    configTemplate.updateValues({
      "app_config.log_level": "debug",
      "app_config.port": "3001",
    });

    configTemplate.updateValues({
      "app_config.log_level": "info",
    });

    await delay(10);

    expect(updates).toMatchInlineSnapshot(`
      Array [
        Object {
          "app_config.log_level": Object {
            "newValue": "debug",
            "oldValue": "info",
          },
          "app_config.port": Object {
            "newValue": 3001,
            "oldValue": 3000,
          },
        },
        Object {
          "app_config.log_level": Object {
            "newValue": "info",
            "oldValue": "debug",
          },
        },
      ]
    `);
  });

  describe("when receiving an update for a property that does not exist in the config template", () => {
    const updates: ConfigTemplateValueUpdates[] = [];

    beforeAll(async () => {
      configTemplate.events.on(
        ConfigTemplateEventKind.ConfigUpdate,
        (update) => {
          updates.push(update);
        }
      );

      configTemplate.updateValues({
        "app_config.yolo": "true",
      });

      await delay(10);
    });

    it("does not emit any updates", () => {
      expect(updates).toHaveLength(0);
    });

    it("does not include the property when retrieving values", () => {
      expect(configTemplate.values()["app_config.yolo"]).toBeUndefined();
    });
  });

  it("returns the config as JSON", () => {
    expect(configTemplate.toJSON()).toMatchSnapshot();
  });
});
