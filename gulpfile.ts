import { quicktype, JSONSchemaInput, InputData } from "quicktype-core";
// TODO: Should look into replacing gulp-transform with a custom stream implementation,
// since it is an old package that has not had much activity, and includes
// dependencies with security issues.
import transform from "gulp-transform";
import { dest, src } from "gulp";
import rename from "gulp-rename";

export default function (): NodeJS.ReadWriteStream {
  return src("./src/jsonSchema/*Schema.json")
    .pipe(transform("utf8", jsonSchemaToTypescript))
    .pipe(
      rename((path) => ({
        ...path,
        basename: path.basename?.replace("Schema", ""),
        extname: ".ts",
      }))
    )
    .pipe(dest("./src/quicktype/"))
    .on("end", () =>
      console.log(
        `Remember to check the output schema files for TypeScript errors like (no-unused-locals) ` +
          `and add a @ts-expect-error annotation to them if necessary.`
      )
    );
}

async function jsonSchemaToTypescript(contents: string): Promise<string> {
  const schemaInput = new JSONSchemaInput(undefined);
  schemaInput.addSourceSync({
    name: "ConfigTemplate",
    schema: contents,
  });

  const inputData = new InputData();
  inputData.addInput(schemaInput);

  const output = await quicktype({
    inputData,
    lang: "ts",
    indentation: "  ",
  });

  return output.lines.join("\n");
}
