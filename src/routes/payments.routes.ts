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
  let { productId, gateway, email, name, userId, serverId } = req.body;
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
      serverId: serverId,
    },
  });

  res.status(200).json(payment);
});
router.post("/webhook", async (req: Request, res: Response) => {
  const payload = req.body;
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
  if (payload.event != "order:paid") {
    return res.status(400).send("Invalid event type");
    return;
  }
  console.log(payload.data.product_id, "645fb8d0eb031");
  if (
    payload.data.product_id != "645fb8d0eb031" &&
    payload.data.product_id != "64627207b5a95"
  ) {
    return res.status(400).send("Invalid product");
    return;
  }
  let subType = payload.data.product_id == "645fb8d0eb031" ? "user" : "server";
  console.log(`payload`, payload);
  console.log(`subType`, subType);

  const orderId = payload.data.id;
  if (subType == "user") {
    let userId = payload.data.custom_fields.userId;
    let { data } = await supabase
      .from("users_new")
      .select("*")
      .eq("id", userId);
    let user = data[0];
    await supabase
      .from("users_new")
      .update({
        subscription: {
          since: user.subscription?.since || new Date(),
          expires:
            user.subscription?.expires + ms("30d") || Date.now() + ms("30d"),
        },
      })
      .eq("id", userId);
    let { data: userObj }: any = await supabase
      .from("users_new")
      .select("*")
      .eq("id", userId);
    userObj = userObj[0];
    redisClient.set(`users:${userId}`, JSON.stringify(userObj));
  } else {
    let serverId = payload.data.custom_fields.serverId;
    let { data } = await supabase
      .from("guilds_new")
      .select("*")
      .eq("id", serverId);
    let server = data[0];
    await supabase
      .from("guilds_new")
      .update({
        subscription: {
          since: server.subscription?.since || new Date(),
          expires:
            server.subscription?.expires + ms("30d") || Date.now() + ms("30d"),
        },
      })
      .eq("id", serverId);
    let { data: serverObj }: any = await supabase
      .from("guilds_new")
      .select("*")
      .eq("id", serverId);
    serverObj = serverObj[0];
    redisClient.set(`guilds:${serverId}`, JSON.stringify(serverObj));
  }
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
      subType: {
        user: 0,
        server: 0,
      },
    };
    stats.subType[subType] += 1;
    stats.total += 1;
    stats[payload.data.gateway] += 1;
    stats.countries[payload.data.metadata.country] = stats.countries[
      payload.data.metadata.country
    ]
      ? stats.countries[payload.data.metadata.country] + 1
      : 1;
  } else {
    stats = JSON.parse(stats);
    stats.total += 1;
    if (stats.subType[subType] == undefined) stats.subType[subType] = 1;
    else stats.subType[subType] += 1;
    stats[payload.data.gateway] += 1;
    stats.countries[payload.data.metadata.country] = stats.countries[
      payload.data.metadata.country
    ]
      ? stats.countries[payload.data.metadata.country] + 1
      : 1;
  }
  await redisClient.set("payment-stats", JSON.stringify(stats));
  res.status(200).json({ success: true });
});

export default router;
