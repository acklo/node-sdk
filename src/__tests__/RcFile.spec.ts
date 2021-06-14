import mock from "mock-fs";
import { RcFile } from "../RcFile";
import * as fs from "fs";

describe("RcFile", () => {
  afterEach(() => {
    mock.restore();
  });

  it("finds and parses the accessToken from an .acklorc.yml file", () => {
    mock({
      ".acklorc.yml": `
profiles:
  default:
    accessToken: my-special-access-token
  test:
    accessToken: test-token
`,
    });
    const rcFile = new RcFile();

    expect(rcFile.profile("default")?.accessToken).toEqual(
      "my-special-access-token"
    );
    expect(rcFile.profile("test")?.accessToken).toEqual("test-token");
    expect(rcFile.profile("nope")?.accessToken).toBeUndefined();
  });

  it("has a null profile if the .acklorc.yml file does not exist", () => {
    mock();
    const rcFile = new RcFile();
    const profile = rcFile.profile("default");
    expect(profile).toBeNull();
  });

  it("writes an rcfile to disk", async () => {
    mock({ app: {} });
    const rcFile = new RcFile("./app", "./app");
    rcFile.setProfile({ accessToken: "abc123", name: "default" });
    rcFile.setProfile({ accessToken: "bca321", name: "mytest" });
    await rcFile.write();

    expect(fs.readFileSync("./app/.acklorc.yml", "utf-8"))
      .toMatchInlineSnapshot(`
      "profiles:
        default:
          accessToken: abc123
        mytest:
          accessToken: bca321
      "
    `);
  });
});
