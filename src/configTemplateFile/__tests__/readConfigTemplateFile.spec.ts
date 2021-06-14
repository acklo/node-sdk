import mock from "mock-fs";
import readConfigTemplateFile from "../readConfigTemplateFile";

describe("readConfigTemplateFile", () => {
  afterEach(() => {
    mock.restore();
  });

  it.each(["acklo.config.yml", "acklo.config.yaml"])(
    "finds the %s config template file when it exists on the file system",
    (fileName) => {
      const contents = `
some:
  great:
    - yaml
    - file
`;
      mock({ [`../${fileName}`]: contents });

      const foundFile = readConfigTemplateFile();
      expect(foundFile).toEqual(contents);
    }
  );

  it("throws an error when the config template can't be found", () => {
    mock();
    expect(() => readConfigTemplateFile()).toThrowErrorMatchingInlineSnapshot(
      `"Could not find acklo config template file"`
    );
  });
});
