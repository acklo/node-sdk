import { AckloClient } from "@acklo/node-sdk";

async function main(name = "there") {
  // Instantiate the acklo client
  const acklo = await new AckloClient({
    applicationKey: "[YOUR APPLICATION KEY]",
    environmentName: "local",
    logLevel: "off",
  }).connect();

  // Get a config property
  console.log(`${acklo.get("config.greeting")} ${name}`);

  await acklo.disconnect();
}

main(process.argv[2])
  .then(() => {
    // no-op
  })
  .catch((err) => console.error("Error", err));
