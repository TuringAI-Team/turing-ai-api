import chalk from "chalk";
import fs from "node:fs";
import { randomUUID } from "node:crypto";

const logsPath = "./logs";
const sessionID = randomUUID();
const logFile = `${logsPath}/${sessionID}.log`;

export default function log(
  type: "info" | "warning" | "error" | "debug",
  ...args
) {
  const log = `[${type.toUpperCase()}] ${args.join(" ")}`;
  const color =
    type === "info"
      ? "green"
      : type === "warning"
      ? "yellow"
      : type === "error"
      ? "red"
      : "white";
  if (
    (process.env.NODE_ENV == "production" && type != "debug") ||
    process.env.NODE_ENV == "development"
  ) {
    console.log(chalk[color](log));
  }
  fs.appendFileSync(logFile, `${log}\n`);
}
