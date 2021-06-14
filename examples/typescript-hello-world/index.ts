import { AckloClient } from "@acklo/node-sdk";

async function main(name = "there") {
  const acklo = await new AckloClient({
    applicationName: "acklo-typescript-hello-world-example",
    environmentName: "local",
    logLevel: "off",
    // accessToken: "[YOUR ACCESS TOKEN]",
  }).connect();

  console.log(`${acklo.get("config.greeting")} ${name}`);

  await acklo.disconnect();
}

main(process.argv[2])
  .then(() => {
    // no-op
  })
  .catch((err) => console.error("Error", err));
