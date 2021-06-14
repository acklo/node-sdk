Documentation is automatically generated from code comments using TypeDoc. Any
changes to externally facing code should have appropriate documentation. Check out [TypeDoc's
docs](https://typedoc.org/guides/doccomments/) for a list of the codedoc tags they support.

## Deploying

This is done manually at this stage by pushing the generated documentation website to a known
S3 bucket, after which the acklo server's deployment process picks them up and makes them available
at https://acklo.app/docs/node_sdk.

```shell
# Make sure that you have a AWS profile set with appropriate access to the acklo AWS account
yarn docs:deploy
```

## Overriding the default theme

We use the TypeDoc `default` theme, with a few overrides in the `typedoc_theme` folder. If you
wish to override something find the relevant theme file in `node_modules/typedoc-default-themes/bin/default`
and copy it into the `typedoc_theme` folder so you can modify it.
