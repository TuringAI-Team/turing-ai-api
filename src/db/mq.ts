import { Connection } from "rabbitmq-client";
import log from "../utils/log.js";
const rabbit = new Connection(process.env.MQ_URL);
rabbit.on("error", (err) => {
  log("error", "RabbitMQ connection error", err);
});
rabbit.on("connection", () => {
  log("info", "RabbitMQ connected");
});

const pub = rabbit.createPublisher({
  // Enable publish confirmations, similar to consumer acknowledgements
  confirm: true,
  // Enable retries
  maxAttempts: 2,
  // Optionally ensure the existence of an exchange before we use it
  exchanges: [{ exchange: "db", type: "topic" }],
});
export { pub };
export default rabbit;
