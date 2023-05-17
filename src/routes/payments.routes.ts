import express from "express";
import { Request, Response } from "express";
import turnstile from "../middlewares/captchas/turnstile.js";
import supabase from "../modules/supabase.js";
import key from "../middlewares/key.js";
import sellix from "@sellix/node-sdk";
import crypto, { createHmac } from "crypto";
import ms from "ms";
import axios from "axios";
import redisClient from "../modules/cache/redis.js";

const router = express.Router();

router.post("/pay", key, async (req: Request, res: Response) => {
  let { productId, gateway, email, name, userId, serverId, credits, plan } =
    req.body;
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
  let data: any = {
    return_url: `https://app.turing.sh/pay/success`,
    email: email,
    white_label: false,
    gateway: gateway || "stripe",
    customer_id: customer,
    custom_fields: {
      userId: userId,
      serverId: serverId,
      plan: plan,
    },
  };
  if (userId) {
    let { data: user }: any = await supabase
      .from("users_new")
      .select("*")
      .eq("id", userId);
    user = user[0];
    if (!user) {
      await supabase.from("users_new").insert([
        {
          id: userId,
          metadata: {
            email: email,
          },
        },
      ]);
      user = {
        id: userId,
        metadata: {
          email: email,
        },
      };
      redisClient.set(`users:${userId}`, JSON.stringify(user));
    } else {
      await supabase
        .from("users_new")
        .update({
          metadata: {
            ...(user.metadata || {}),
            email: email,
          },
        })
        .eq("id", userId);
      redisClient.set(`users:${userId}`, JSON.stringify(user));
    }
  }
  if (credits && plan == "credits") {
    data.custom_fields.credits = credits;
    // change price
    data.value = credits;
    data.currency = "USD";
  } else {
    data.product_id = productId;
  }
  console.log(`data`, data);
  const payment = await Sellix.payments.create(data);

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
          expires: new Date(
            user.subscription?.expires + ms("30d") || Date.now() + ms("30d")
          ),
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
    console.log(`serverId`, serverId);
    let { data } = await supabase
      .from("guilds_new")
      .select("*")
      .eq("id", serverId);
    let server = data[0];
    console.log(`server`, server);
    if (!server) {
      await supabase.from("guilds_new").insert({
        id: serverId,
        subscription: {
          since: new Date(),
          expires: new Date(Date.now() + ms("30d")),
        },
      });
    } else {
      await supabase
        .from("guilds_new")
        .update({
          subscription: {
            since: server.subscription?.since || new Date(),
            expires:
              new Date(server.subscription?.expires + ms("30d")) ||
              new Date(Date.now() + ms("30d")),
          },
        })
        .eq("id", serverId);
    }

    let { data: serverObj }: any = await supabase
      .from("guilds_new")
      .select("*")
      .eq("id", serverId);
    serverObj = serverObj[0];
    redisClient.set(`guilds:${serverId}`, JSON.stringify(serverObj));
  }
  let stats: any = await redisClient.get("payment-stats");
  console.log(`stats`, stats);
  let country = payload.data?.country || "Unknown";
  if (!country) country = "Unknown";
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
    stats.countries[country] = stats.countries[country]
      ? stats.countries[country] + 1
      : 1;
  } else {
    stats = JSON.parse(stats);
    stats.total += 1;
    if (!stats.subType)
      stats.subType = {
        [subType]: 1,
      };
    if (stats.subType[subType] == undefined) {
      stats.subType[subType] = 1;
    } else stats.subType[subType] += 1;
    stats[payload.data.gateway] += 1;
    if (!stats.countries) {
      stats.countries = {};
      stats.countries[country] = 1;
    }
    if (!stats.countries[country]) {
      stats.countries[country] = 1;
    }
    stats.countries[country] = stats.countries[country]
      ? stats.countries[country] + 1
      : 1;
  }
  await redisClient.set("payment-stats", JSON.stringify(stats));
  res.status(200).json({ success: true });
});
router.post("/guilds", async (req: Request, res: Response) => {
  let accessToken = req.body.accessToken;
  let response = await axios({
    url: `https://discord.com/api/v8/users/@me/guilds?limit=100`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  let guilds = response.data;
  res.status(response.status).json(guilds);
});

export default router;
