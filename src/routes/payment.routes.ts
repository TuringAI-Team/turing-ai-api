import express from "express";
import supabase from "../db/supabase.js";
import key from "../middlewares/key.js";
import sellix from "@sellix/node-sdk";
import crypto from "crypto";
import ms from "ms";
import axios from "axios";
import redisClient from "../db/redis.js";
import geo from "../middlewares/geo.js";
import { update } from "../utils/db.js";

const router = express.Router();

const creditProducts = {
  "1": {
    id: "646522a50ace5",
    credits: 1,
  },
  "2": {
    id: "646522c90d14b",
    credits: 2,
  },
  "5": {
    id: "646522edc9989",
    credits: 5,
  },
};

router.post("/pay", key, geo, async (req, res) => {
  let {
    productId,
    gateway,
    email,
    name,
    userId,
    serverId,
    credits,
    plan,
    subType,
  } = req.body;
  credits = parseInt(credits);
  const Sellix = sellix(process.env.SELLIX_KEY);
  let customer;
  let customers = await Sellix.customers.list();
  customer = customers.filter(
    (c: any) => c.email.toLowerCase() == email.toLowerCase()
  )[0];

  if (!customer) {
    try {
      customer = await Sellix.customers.create({
        name: name,
        email: email,
        surname: "Unknown",
      });
    } catch (err) {
      let customers = await Sellix.customers.list();
      customer = customers.filter(
        (c: any) => c.email.toLowerCase() == email.toLowerCase()
      )[0];
      if (!customer) {
        res.json({ error: "Failed to create customer", success: false });
        return;
      }
    }
  } else {
    customer = customer.id;
  }
  console.log(customer);
  try {
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
        subType: subType,
      },
    };
    if (userId) {
      await update("update", {
        collection: "users",
        id: userId,
        metadata: {
          email: email,
          country: req.geo.country ? req.geo.country : "Unknown",
          region: req.geo.region ? req.geo.region : "Unknown",
        },
      });
    }
    if (credits && plan == "credits") {
      data.custom_fields.credits = credits;
      // make a list of credit products
      let products = [];
      let creditsBy5 = Math.floor(credits / 5);
      let creditsBy2 = Math.floor((credits - creditsBy5 * 5) / 2);
      let creditsBy1 = Math.floor(credits - creditsBy5 * 5 - creditsBy2 * 2);
      if (creditsBy5 > 0) {
        products.push({
          uniqid: creditProducts["5"].id,
          unit_quantity: creditsBy5,
        });
      }
      if (creditsBy2 > 0) {
        products.push({
          uniqid: creditProducts["2"].id,
          unit_quantity: creditsBy2,
        });
      }
      if (creditsBy1 > 0) {
        products.push({
          uniqid: creditProducts["1"].id,
          unit_quantity: creditsBy1,
        });
      }
      data.cart = {
        products: products,
      };
      data.quantity = 1;
    } else {
      data.product_id = productId;
    }
    console.log(data);
    const payment = await Sellix.payments.create(data);
    console.log(payment);

    res.status(200).json({ ...payment, success: true });
  } catch (e: any) {
    console.log(`error ${e}, for user ${userId}`);
    res.status(500).json({
      error: e.error,
      url: `https://app.turing.sh/pay`,
      success: false,
    });
  }
});
router.post("/webhook", async (req, res) => {
  const payload = req.body;
  const headerSignature = req.headers["x-sellix-unescaped-signature"];
  if (!headerSignature) {
    return res.status(401).send("No signature");
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
    console.log("Invalid signature", signature);
    return res.status(401).send("Invalid signature");
  }
  if (payload.event != "order:paid") {
    return res.status(400).send("Invalid event type");
    return;
  }
  console.log(payload.data.product_id, "645fb8d0eb031");
  if (
    payload.data.product_id != "645fb8d0eb031" &&
    payload.data.product_id != "64627207b5a95" &&
    payload.data.custom_fields.plan != "credits"
  ) {
    return res.status(400).send("Invalid product");
    return;
  }
  let subType = payload.data.custom_fields.subType;
  let plan = payload.data.custom_fields.plan;
  let credits = parseInt(payload.data.custom_fields.credits);

  const orderId = payload.data.id;
  if (plan == "credits") {
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
          plan: {
            total: user.plan?.total + credits || credits,
            expenses: user.plan?.expenses || [],
            used: user.plan?.used || 0,
            history: [
              ...(user.plan?.history || []),
              {
                time: Date.now(),
                type: "web",
                amount: credits,
                gateway: payload.data.gateway,
              },
            ],
          },
        })
        .eq("id", userId);
      let { data: userObj }: any = await supabase
        .from("users_new")
        .select("*")
        .eq("id", userId);
      userObj = userObj[0];
      redisClient.set(`users:${userId}`, JSON.stringify(userObj));
    }
    if (subType == "server") {
      let serverId = payload.data.custom_fields.serverId;
      let { data } = await supabase
        .from("guilds_new")
        .select("*")
        .eq("id", serverId);
      let server = data[0];
      if (!server) {
        await supabase.from("guilds_new").insert([
          {
            id: serverId,
            plan: {
              total: credits,
              expenses: [],
              used: 0,
              history: [
                {
                  time: Date.now(),
                  type: "web",
                  amount: credits,
                  gateway: payload.data.gateway,
                },
              ],
            },
          },
        ]);
      } else {
        await supabase
          .from("guilds_new")
          .update({
            plan: {
              total: server.plan?.total + credits || credits,
              expenses: server.plan?.expenses || [],
              used: server.plan?.used || 0,
              history: [
                ...(server.plan?.history || []),
                {
                  time: Date.now(),
                  type: "web",
                  amount: credits,
                  gateway: payload.data.gateway,
                },
              ],
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
  } else {
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
            since: Date.now(),
            expires: Date.now() + ms("30d"),
          },
        });
      } else {
        await supabase
          .from("guilds_new")
          .update({
            subscription: {
              since: server.subscription?.since || Date.now(),
              expires:
                server.subscription?.expires + ms("30d") ||
                Date.now() + ms("30d"),
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
  }
  let stats: any = await redisClient.get("payment-stats");
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

router.post("/guilds", async (req, res) => {
  let accessToken = req.body.accessToken;
  try {
    let response = await axios({
      url: `https://discord.com/api/v8/users/@me/guilds?limit=200`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    let guilds = response.data;

    res.status(response.status).json(guilds);
  } catch (e: any) {
    res.status(500).json({ error: e.response.data });
  }
});

export default router;
