import { getUpdatedStats } from "./stats.js";
import ms from "ms";

export default async function ciclic() {
  let guilds = await getUpdatedStats();
  console.log(guilds);
  setInterval(async () => {
    guilds = await getUpdatedStats();
  }, ms("1h"));
}
