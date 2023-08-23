import express from "express";
import { Request, Response } from "express";
import turnstile from "../middlewares/captchas/turnstile.js";
import key from "../middlewares/key.js";
import client from "../index.js";
import log from "../utils/log.js";
import redisClient from "../db/redis.js";
import { update } from "../utils/db.js";
import delay from "delay";
import { dataset } from "../utils/datasets.js";

const router = express.Router();

router.post(
  "/:type",
  key,
  turnstile,
  async (req: Request, res: Response) => await request(req, res)
);

router.post(
  "/:type/:ai",
  key,
  turnstile,
  async (req: Request, res: Response) => await request(req, res)
);

async function request(req, res) {
  let { type, ai } = req.params;
  const body = req.body;
  let logq = false;
  // random probability of 10% to log if the request  is type text
  if (type == "text") {
    logq = Math.random() < 0.1;
  }
  if (!ai) {
    ai = body.ai;
  }
  if (ai == "alan") {
    ai = "gpt";
    body.plugins = ["google"];
  }
  let typeObj = client[type];
  if (body.stream) {
    res.set("content-type", "text/event-stream");
  }
  if (!typeObj) {
    res.status(404).json({ success: false, error: "Type not found" });
    return;
  }
  try {
    let aiObject = typeObj.find((a) => a.data.name === ai);
    if (!aiObject) {
      log("info", `AI not found: ${ai}`, typeObj);
      res.status(404).json({ success: false, error: "AI not found" });
      return;
    }

    // check params and body
    let realParameters = aiObject.data.parameters; // is an object with keys as parameter names and values as parameter types
    let parameters = Object.keys(realParameters);
    let requiredParams = parameters.filter(
      (p) => realParameters[p].required === true
    );
    let bodyKeys = Object.keys(body);
    // check if all required params are in body
    let missingParams = requiredParams.filter((p) => !bodyKeys.includes(p));
    if (missingParams.length > 0) {
      res.status(400).json({
        success: false,
        error: `Missing parameters: ${missingParams.join(", ")}`,
      });
      return;
    }

    // not existing params
    /*
    let notExistingParams = bodyKeys.filter((p) => !parameters.includes(p));
    if (notExistingParams.length > 0) {
      res.status(400).json({
        success: false,
        error: `Not existing parameters: ${notExistingParams.join(", ")}`,
      });
      return;
    }*/
    let execution = await aiObject.execute(body);
    if (body.stream) {
      execution.on("data", async (data) => {
        if (data.done || data.status == "done" || data.status == "failed") {
          if (data.record) {
            //  await dataset(type, ai, data.record, data.id);
            delete data.record;
          }
          res.write("data: " + JSON.stringify(data) + "\n\n");
          res.end();
          if (data.cost) {
            applyCost(data.cost, ai, type, req.user);
          }
        } else {
          res.write("data: " + JSON.stringify(data) + "\n\n");
        }
      });
    } else {
      if (execution?.cost) {
        applyCost(execution.cost, ai, type, req.user);
      }
      new Promise((resolve) => {
        execution.on("data", async (data) => {
          if (data.done || data.status == "done" || data.status == "failed") {
            if (data.record) {
              //  await dataset(type, ai, data.record, data.id);
              delete data.record;
            }

            resolve(data);
          }
        });
      }).then((d: any) => {
        res.json({ success: true, ...d });
      });
    }
  } catch (error: any) {
    let resultError = error;
    if (error.response && error.response.data) {
      resultError = error.response.data;
    }
    console.log(error.response);
    res.status(500).json({ success: false, error: resultError });
  }
}

router.get("/list", (req, res) => {
  let types = Object.keys(client);
  let result = {};
  types.forEach((t) => {
    result[t] = client[t].map((a) => a.data);
  });
  res.json({ success: true, types: result });
});

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to the API, docs at https://docs.turing.sh",
  });
});

async function applyCost(cost, ai, type, user) {
  //  add a 20% fee
  let totalCost = cost * 1.2;
  if (user && user.id != "530102778408861706") {
    console.log(`Cost: ${totalCost}$`);

    let updatedUser: any = await redisClient.get(`users:${user.id}`);
    updatedUser = JSON.parse(updatedUser);
    let plan = updatedUser.plan;
    plan.used += totalCost;
    plan.expenses.push({
      data: {
        model: ai,
        type,
        tokens: {},
      },
      time: Date.now(),
      type: "api",
      used: totalCost,
    });
    await update("update", {
      collection: "users",
      id: user.id,
      plan,
    });
    await delay(3000);
    let up = JSON.parse(await redisClient.get(`users:${user.id}`)).plan;
  }
}

export default router;
