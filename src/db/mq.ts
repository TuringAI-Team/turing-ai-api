import { Connection } from "rabbitmq-client";
const rabbit = new Connection(process.env.MQ_URL);
rabbit.on("error", (err) => {
  console.log("RabbitMQ connection error", err);
});
rabbit.on("connection", () => {
  console.log("Connection successfully (re)established");
});

const pub = rabbit.createPublisher({
  // Enable publish confirmations, similar to consumer acknowledgements
  confirm: true,
  // Enable retries
  maxAttempts: 2,
  // Optionally ensure the existence of an exchange before we use it
  exchanges: [{ exchange: "messages", type: "topic" }],
});
export { pub };
export default rabbit;
