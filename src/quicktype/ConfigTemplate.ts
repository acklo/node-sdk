// To parse this data:
//
//   import { Convert, ConfigTemplate } from "./file";
//
//   const configTemplate = Convert.toConfigTemplate(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

/**
 * acklo configuration file - defines an application's configuration so that it may be
 * remotely configured using acklo.
 *
 * For more information check out the [acklo docs](https://acklo.app/docs).
 */
export interface ConfigTemplate {
  /**
   * A list of configurations for the application being integrated with acklo.
   */
  configuration?: Configuration[];
  /**
   * The version of this file's syntax, used for backwards compatibility.
   *
   * @example
   * `v1`
   *
   * @default
   * `v1`
   */
  version: number | string;
}

/**
 * Configuration of an application.
 */
export interface Configuration {
  /**
   * An expanded description of what this configuration group does.
   *
   * This will appear on the acklo dashboard.
   */
  description?: string;
  /**
   * Identifies the configuration.
   *
   * @example
   * `feature_switches`
   */
  id: string;
  /**
   * A human readable name for this configuration.
   *
   * This will appear on the acklo dashboard.
   *
   * @example
   * `Feature switches`
   */
  name?: string;
  properties?: Property[];
}

export interface Property {
  /**
   * The default value for this configuration property. If no custom configuration has been
   * set
   * in the acklo UI, or if the application using the SDK fails to connect to the acklo
   * servers, this
   * default value will be used instead.
   *
   * @example
   * `true`
   */
  default: boolean | number | null | string;
  /**
   * Identifies this configuration property.
   *
   * @example
   * `new_header`
   */
  id: string;
  /**
   * A human readable name for this configuration property.
   *
   * This will appear on the acklo dashboard.
   *
   * @example
   * `New header`
   */
  name?: string;
  /**
   * The type of configuration property this is (i.e. boolean, string, number, etc).
   *
   * Possible values are:
   * - `boolean`
   * - `string`
   * - `number`
   *
   * @example
   * `string`
   */
  type: Type;
}

/**
 * The type of configuration property this is (i.e. boolean, string, number, etc).
 *
 * Possible values are:
 * - `boolean`
 * - `string`
 * - `number`
 *
 * @example
 * `string`
 */
export enum Type {
  Boolean = "boolean",
  Number = "number",
  String = "string",
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
  public static toConfigTemplate(json: string): ConfigTemplate {
    return cast(JSON.parse(json), r("ConfigTemplate"));
  }

  public static configTemplateToJson(value: ConfigTemplate): string {
    return JSON.stringify(uncast(value, r("ConfigTemplate")), null, 2);
  }
}

function invalidValue(typ: any, val: any, key: any = ""): never {
  if (key) {
    throw Error(
      `Invalid value for key "${key}". Expected type ${JSON.stringify(
        typ
      )} but got ${JSON.stringify(val)}`
    );
  }
  throw Error(
    `Invalid value ${JSON.stringify(val)} for type ${JSON.stringify(typ)}`
  );
}

function jsonToJSProps(typ: any): any {
  if (typ.jsonToJS === undefined) {
    const map: any = {};
    typ.props.forEach((p: any) => (map[p.json] = { key: p.js, typ: p.typ }));
    typ.jsonToJS = map;
  }
  return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
  if (typ.jsToJSON === undefined) {
    const map: any = {};
    typ.props.forEach((p: any) => (map[p.js] = { key: p.json, typ: p.typ }));
    typ.jsToJSON = map;
  }
  return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = ""): any {
  function transformPrimitive(typ: string, val: any): any {
    if (typeof typ === typeof val) return val;
    return invalidValue(typ, val, key);
  }

  function transformUnion(typs: any[], val: any): any {
    // val must validate against one typ in typs
    const l = typs.length;
    for (let i = 0; i < l; i++) {
      const typ = typs[i];
      try {
        return transform(val, typ, getProps);
      } catch (_) {}
    }
    return invalidValue(typs, val);
  }

  function transformEnum(cases: string[], val: any): any {
    if (cases.indexOf(val) !== -1) return val;
    return invalidValue(cases, val);
  }

  function transformArray(typ: any, val: any): any {
    // val must be an array with no invalid elements
    if (!Array.isArray(val)) return invalidValue("array", val);
    return val.map((el) => transform(el, typ, getProps));
  }

  function transformDate(val: any): any {
    if (val === null) {
      return null;
    }
    const d = new Date(val);
    if (isNaN(d.valueOf())) {
      return invalidValue("Date", val);
    }
    return d;
  }

  function transformObject(
    props: { [k: string]: any },
    additional: any,
    val: any
  ): any {
    if (val === null || typeof val !== "object" || Array.isArray(val)) {
      return invalidValue("object", val);
    }
    const result: any = {};
    Object.getOwnPropertyNames(props).forEach((key) => {
      const prop = props[key];
      const v = Object.prototype.hasOwnProperty.call(val, key)
        ? val[key]
        : undefined;
      result[prop.key] = transform(v, prop.typ, getProps, prop.key);
    });
    Object.getOwnPropertyNames(val).forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(props, key)) {
        result[key] = transform(val[key], additional, getProps, key);
      }
    });
    return result;
  }

  if (typ === "any") return val;
  if (typ === null) {
    if (val === null) return val;
    return invalidValue(typ, val);
  }
  if (typ === false) return invalidValue(typ, val);
  while (typeof typ === "object" && typ.ref !== undefined) {
    typ = typeMap[typ.ref];
  }
  if (Array.isArray(typ)) return transformEnum(typ, val);
  if (typeof typ === "object") {
    return typ.hasOwnProperty("unionMembers")
      ? transformUnion(typ.unionMembers, val)
      : typ.hasOwnProperty("arrayItems")
      ? transformArray(typ.arrayItems, val)
      : typ.hasOwnProperty("props")
      ? transformObject(getProps(typ), typ.additional, val)
      : invalidValue(typ, val);
  }
  // Numbers can be parsed by Date but shouldn't be.
  if (typ === Date && typeof val !== "number") return transformDate(val);
  return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
  return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
  return transform(val, typ, jsToJSONProps);
}

function a(typ: any) {
  return { arrayItems: typ };
}

function u(...typs: any[]) {
  return { unionMembers: typs };
}

function o(props: any[], additional: any) {
  return { props, additional };
}

function r(name: string) {
  return { ref: name };
}

const typeMap: any = {
  ConfigTemplate: o(
    [
      {
        json: "configuration",
        js: "configuration",
        typ: u(undefined, a(r("Configuration"))),
      },
      { json: "version", js: "version", typ: u(3.14, "") },
    ],
    false
  ),
  Configuration: o(
    [
      { json: "description", js: "description", typ: u(undefined, "") },
      { json: "id", js: "id", typ: "" },
      { json: "name", js: "name", typ: u(undefined, "") },
      {
        json: "properties",
        js: "properties",
        typ: u(undefined, a(r("Property"))),
      },
    ],
    false
  ),
  Property: o(
    [
      { json: "default", js: "default", typ: u(true, 3.14, null, "") },
      { json: "id", js: "id", typ: "" },
      { json: "name", js: "name", typ: u(undefined, "") },
      { json: "type", js: "type", typ: r("Type") },
    ],
    false
  ),
  Type: ["boolean", "number", "string"],
};
