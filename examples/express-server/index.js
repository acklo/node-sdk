const express = require("express");
const AckloClient = require("@acklo/node-sdk").AckloClient;

// Instantiate the SDK
const acklo = new AckloClient({
  applicationKey: "[YOUR APPLICATION KEY]",
  environmentName: "local",
});

async function main() {
  // Connect to acklo to retrieve the latest config and stay in sync with
  // any config updates.
  await acklo.connect();

  // Get some config values from acklo.
  const port = acklo.get("config.port");
  const messageOfTheDay = acklo.get("config.motd");

  const app = express();

  app.get("/", (_, res) => {
    if (acklo.get("switches.maximize_excitement")) {
      res.json({ motd: `${messageOfTheDay}!!!!!!!!!!!` });
    } else {
      res.json({ motd: messageOfTheDay });
    }
  });

  let server = app.listen(port);
  console.log(`Listening on port ${port}`);

  acklo.onConfigUpdate((updates) => {
    if (updates["config.port"]) {
      const newPort = updates["config.port"].newValue;
      server.close();
      server = app.listen(newPort);
      console.log(`Changed port to ${newPort}`);
    }
  });
}

main()
  .then(() => console.log("Initialized server"))
  .catch((err) => console.error(`Error initializing server: ${err}.`));
