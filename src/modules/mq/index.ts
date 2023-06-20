import { Connection } from "rabbitmq-client";
const rabbit = new Connection(process.env.MQ_URL);
rabbit.on("error", (err) => {
  console.log("RabbitMQ connection error", err);
});
rabbit.on("connection", () => {
  console.log("Connection successfully (re)established");
});
export default rabbit;
