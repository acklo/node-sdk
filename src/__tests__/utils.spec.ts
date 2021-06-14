import path from "path";
import mock from "mock-fs";
import { findFile } from "../utils";

describe("utils", () => {
  describe("findFile()", () => {
    afterEach(() => {
      mock.restore();
    });

    it("returns absolute path to the file when it exists", () => {
      mock({ "../../my-file.json": "" });

      const foundPath = findFile("my-file.json", process.cwd());
      expect(foundPath).toBe(path.resolve("..", "..", "my-file.json"));
    });

    describe("when finding multiple files", () => {
      it("returns the absolute path to the closest file", () => {
        mock({
          "../../a-file.json": "",
          "../closer-file.json": "",
        });

        expect(
          findFile(["a-file.json", "closer-file.json"], process.cwd())
        ).toBe(path.resolve("..", "closer-file.json"));
      });

      it("returns the absolute path to the first file being found when the files are in the same directory", () => {
        mock({
          "a.json": "",
          "b.json": "",
        });

        expect(findFile(["b.json", "a.json"], process.cwd())).toBe(
          path.resolve("b.json")
        );
      });
    });

    it("returns false when the file does not exist", () => {
      expect(findFile("not-a-file", process.cwd())).toBe(false);
    });
  });
});
