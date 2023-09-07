import express from "express";
import supabase from "../db/supabase.js";
import { Request, Response } from "express";
import key from "../middlewares/key.js";
import { generateKey } from "../utils/key.js";
import redisClient from "../db/redis.js";

const router = express.Router();

async function secret(req, res, next) {
  let { secret } = req.headers;
  if (secret == process.env.SUPER_KEY) {
    next();
  } else {
    res.json({ success: false, error: "no permissions" });
  }
}
router.post("/", key, secret, async (req: Request, res: Response) => {
  let { name, user } = req.body;
  let key = await generateKey(user, name);
  res.json({ success: true, key });
});

router.delete("/", key, secret, async (req: Request, res: Response) => {
  let { keyId, user } = req.body;
  let { data, error: err } = await supabase
    .from("api_keys")
    .select("*")
    .eq("id", keyId)
    .eq("userId", user);

  if (err) {
    res.json({ success: false, error: err });
    return;
  }
  let { error } = await supabase
    .from("api_keys")
    .delete()
    .eq("id", keyId)
    .eq("userId", user);

  if (error) {
    res.json({ success: false, error });
    return;
  }
  await redisClient.del(`api:${data[0]["api-token"]}`);
  res.json({ success: true });
});

router.get("/u/:user", key, secret, async (req: Request, res: Response) => {
  let { user } = req.params;
  let { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("userId", user)
    .order("created_at", { ascending: false });

  if (error) {
    res.json({ success: false, error });
    return;
  }
  let keys = data.map((d) => {
    return {
      id: d.id,
      name: d.name,
      createdAt: d.createdAt,
      lastUsed: d.lastUsed,
      uses: d.uses,
    };
  });
  res.json({ success: true, keys });
});
router.get(
  "/k/:key/:user",
  key,
  secret,
  async (req: Request, res: Response) => {
    let { key, user } = req.params;
    let { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .eq("id", key)
      .eq("userId", user);
    if (error) {
      res.json({ success: false, error });
      return;
    }
    if (data.length == 0) {
      res.json({ success: false, error: "no key found" });
      return;
    }
    let d = data[0];
    let keyData = {
      id: d.id,
      apiToken: d["api-token"],
      captchaToken: d["captcha-token"],
      name: d.name,
      createdAt: d.created_at,
      lastUsed: d.lastUsed,
    };
    res.json({ success: true, key: keyData });
  }
);

export default router;
