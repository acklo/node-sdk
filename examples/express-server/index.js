const express = require("express");
const AckloClient = require("@acklo/node-sdk").AckloClient;

const acklo = new AckloClient({
  applicationName: "acklo-express-server-example",
  environmentName: "local",
  // accessToken: "[YOUR ACCESS TOKEN]",
});

acklo
  .connect()
  .then(() => console.log("Connected to acklo!"))
  .catch((err) => console.error("Failed to connect to acklo", err));

const app = express();

const port = acklo.get("config.port");
const motd = acklo.get("config.motd");

app.get("/", (_, res) => {
  if (acklo.get("switches.maximize_excitement")) {
    res.json({ motd: `${motd}!!!!!!!!!!!` });
  } else {
    res.json({ motd });
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
