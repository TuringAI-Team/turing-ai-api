import ms from "ms";
import { saveMetrics } from "./stats/ads.js";
import SavePaymentMetrics from "./stats/payments.js";
import supabase from "./supabase.js";

export default async function Ciclic() {
  await saveMetrics();
  await SavePaymentMetrics();
  await putGAcc0();
  setInterval(async () => {
    await saveMetrics();
    await SavePaymentMetrics();
  }, ms("1h"));
}

export async function putGAcc0() {
  let { data: accs } = await supabase.from("g_accs").select("*");
  for (let acc of accs) {
    await supabase
      .from("g_accs")
      .update({
        messages: 0,
      })
      .eq("id", acc.id);
  }
}
