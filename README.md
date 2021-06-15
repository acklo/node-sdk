# @acklo/node-sdk

Node.js SDK for [acklo](https://acklo.app).

[🏠 acklo](https://acklo.app) | [🚀 Getting started guide](https://acklo.app/docs/quick_starts/getting_started_with_the_nodejs_sdk) | [📘 SDK documentation](https://acklo.app/docs/nodejs_sdk)

[![acklo's node SDK is hosted on NPM](https://img.shields.io/npm/v/@acklo/node-sdk?label=%40acklo%2Fnode-sdk)](https://www.npmjs.com/package/@acklo/node-sdk)

---

## Getting started

_To see complete guides for getting started with the SDK, check out the [acklo docs](https://acklo.app/docs)._

**Install it...**

```shell
# Using NPM
npm install --save @acklo/node-sdk

# ... or using Yarn
yarn add @acklo/node-sdk
```

**Use it...**

```js
// index.js
const acklo = new require("@acklo/node-sdk").AckloClient({
  applicationName: "my-app",
  environmentName: "local",
  accessToken: "[Your SDK access token]",
});

await acklo.connect();

const todaysGreeting = acklo.get("config.greeting");
console.log(`${todaysGreeting} there!`);
```

## Examples

Examples of how to use acklo have been set up in the [`examples`](https://github.com/acklo/node-sdk/tree/master/examples) directory of this repo.

## Contributing

- [Docs site generation with TypeDoc](./docs/typedoc.md)
- [Publishing to NPM](./docs/publishing_to_npm.md)
