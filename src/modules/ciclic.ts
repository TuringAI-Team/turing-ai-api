import ms from "ms";
import { saveMetrics } from "./stats/ads.js";
import SavePaymentMetrics from "./stats/payments.js";

export default async function Ciclic() {
  await saveMetrics();
  await SavePaymentMetrics();
  setInterval(async () => {
    await saveMetrics();
    await SavePaymentMetrics();
  }, ms("1h"));
}
