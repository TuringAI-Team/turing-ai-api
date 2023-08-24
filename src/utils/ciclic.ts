import { getUpdatedStats } from "./stats.js";
import ms from "ms";

export default async function ciclic() {
  if (process.env.NODE_ENV == "production") {
    let guilds = await getUpdatedStats();
    console.log(guilds);
    setInterval(async () => {
      guilds = await getUpdatedStats();
    }, ms("1h"));
  }
}
