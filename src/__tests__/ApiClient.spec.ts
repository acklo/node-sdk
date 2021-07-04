import axios from "axios";
import { ApiClient } from "../ApiClient";
import { ApiInstanceResponse } from "../types";
import * as YAML from "yaml";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;
mockedAxios.create.mockImplementation(() => mockedAxios);

describe("ApiClient", () => {
  const accessToken = "some-access-token";
  const baseURL = "http://api.com";

  let apiClient: ApiClient;

  beforeEach(() => {
    apiClient = new ApiClient(accessToken, baseURL);
  });

  it("creates the axios client with expected parameters", () => {
    expect(mockedAxios.create).toHaveBeenCalledWith({
      baseURL,
      headers: { "x-api-key": accessToken },
      timeout: 5_000,
    });
  });

  describe("createInstance", () => {
    it("returns the instance details when a successful api request is made", async () => {
      const applicationKey = "acklo.app.4xdjucrpl33thaxxolRw";
      const environmentName = "env";
      const rawConfigTemplateContent = YAML.stringify({ hey: "test" });
      const configTemplateContent = JSON.stringify(
        YAML.parse(rawConfigTemplateContent)
      );
      const instanceId = "hey";

      const response: ApiInstanceResponse = {
        id: instanceId,
        name: "random-name-1234",
        url: "http://localhost/random-name-1234",
      };

      mockedAxios.post.mockResolvedValueOnce({ data: response });

      const res = await apiClient.createInstance(
        applicationKey,
        environmentName,
        configTemplateContent,
        rawConfigTemplateContent,
        "1.0.0"
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/instances",
        {
          environment_name: environmentName,
          raw_config_template_content: rawConfigTemplateContent,
          config_template_content: configTemplateContent,
          config_template_content_type: "application/json",
          sdk_name: "node-sdk",
          sdk_version: "1.0.0",
          tags: {},
        },
        { headers: { "x-acklo-app-key": applicationKey } }
      );

      expect(res.id).toEqual(instanceId);
    });

    it("throws an error when the api request fails", async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error("something broke"));
      await expect(
        apiClient.createInstance("", "", "", "", "")
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unable to create instance"`
      );
    });
  });
});
