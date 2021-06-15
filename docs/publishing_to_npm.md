Publishing to the NPM registry is done manually at this stage, using
this command:

```bash
yarn npm publish
```

Once a new version has been published, the following steps should be taken:
1. A [GitHub release](https://github.com/acklo/node-sdk/releases/new) should be
    created using this template:
   
    ~~~md
    [Brief description]
   
    ## What's changed?
   
    [List of PRs included in release]
    - [PR name] ([PR number with link])

    ---

    Also published to [npm](https://www.npmjs.com/package/@acklo/node-sdk). Install with:

    ```
    npm install "@acklo/node-sdk@~[New version]"
    # or
    yarn add "@acklo/node-sdk@~[New version]"
    ```
    ~~~
1. TypeDoc documentation should be [regenerated](./typedoc.md).
