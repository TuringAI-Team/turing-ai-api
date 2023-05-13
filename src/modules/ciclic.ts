import ms from "ms";
import { saveMetrics } from "./stats/ads.js";
export default async function Ciclic() {
  await saveMetrics();
  setInterval(async () => {
    await saveMetrics();
  }, ms("1h"));
}
