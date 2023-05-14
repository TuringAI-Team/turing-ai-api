import express from "express";
import { Request, Response } from "express";
import turnstile from "../middlewares/captchas/turnstile.js";
import supabase from "../modules/supabase.js";
import key from "../middlewares/key.js";
import sellix from "@sellix/node-sdk";
import crypto, { createHmac } from "crypto";
import ms from "ms";
import redisClient from "../modules/cache/redis.js";

const router = express.Router();

router.post("/pay", key, async (req: Request, res: Response) => {
  let { productId, gateway, email, name, userId } = req.body;
  console.log(req.body);
  const Sellix = sellix(process.env.SELLIX_KEY);
  let customer;
  let customers = await Sellix.customers.list();
  customer = customers.filter((c: any) => c.email === email)[0];
  if (!customer) {
    customer = await Sellix.customers.create({
      name: name,
      email: email,
      surname: "Unknown",
    });
  } else {
    customer = customer.id;
  }
  const payment = await Sellix.payments.create({
    product_id: productId,
    return_url: `https://app.turing.sh/pay/success`,
    email: email,
    white_label: false,
    gateway: gateway || "stripe",
    customer_id: customer,
    custom_fields: {
      userId: userId,
    },
  });

  res.status(200).json(payment);
});
router.post("/webhook", async (req: Request, res: Response) => {
  const payload = req.body;
  console.log(`payload`, payload);
  const headerSignature = req.headers["x-sellix-unescaped-signature"];
  if (!headerSignature) {
    return res.status(401).send("No signature");
    return;
  }

  const signature = crypto
    .createHmac("sha512", process.env.SELLIX_WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest("hex");

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      // @ts-ignore
      Buffer.from(headerSignature, "utf-8")
    )
  ) {
    return res.status(401).send("Invalid signature");
    return;
  }
  if (payload.event !== "order.paid") {
    return res.status(400).send("Invalid event type");
    return;
  }
  if (payload.data.product_id != "645fb8d0eb031") {
    return res.status(400).send("Invalid product");
    return;
  }
  const orderId = payload.data.id;

  let userId = payload.data.custom_fields.userId;
  let { data } = await supabase.from("users_new").select("*").eq("id", userId);
  let user = data[0];
  await supabase
    .from("users_new")
    .update({
      subscription: {
        since: user.subscription.since || Date.now(),
        expires:
          user.subscription.expires + ms("30d") || Date.now() + ms("30d"),
      },
    })
    .eq("id", userId);

  let stats: any = await redisClient.get("payment-stats");
  console.log(`stats`, stats);
  if (!stats) {
    stats = {
      total: 0,
      stripe: 0,
      paypal: 0,
      bitcoin: 0,
      ethereum: 0,
      binance: 0,
      countries: {},
    };
    stats.total += 1;
    stats[payload.data.gateway] += 1;
    stats.countries[payload.data.country] = stats.countries[
      payload.data.country
    ]
      ? stats.countries[payload.data.country] + 1
      : 1;
  } else {
    stats = JSON.parse(stats);
    stats.total += 1;
    stats[payload.data.gateway] += 1;
    stats.countries[payload.data.country] = stats.countries[
      payload.data.country
    ]
      ? stats.countries[payload.data.country] + 1
      : 1;
  }
  await redisClient.set("payment-stats", JSON.stringify(stats));
  res.status(200).json({ success: true });
});

export default router;
