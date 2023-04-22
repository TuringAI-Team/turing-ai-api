import express from "express";
import { Request, Response } from "express";
import {
  checkInCache,
  saveInCache,
  addUsesInCache,
} from "../modules/cache/index.js";
import redisClient from "../modules/cache/redis.js";

const router = express.Router();

router.post("/savecache", async (req: Request, res: Response) => {
  let { message, response, model } = req.body;
  if (model == "chatgpt") return res.json({ success: true }).status(200);
  console.log("save cache" + " " + model);

  await saveInCache(message, response, model);
  res.json({ success: true }).status(200);
});
router.post("/checkcache", async (req: Request, res: Response) => {
  console.log("check cache");
  let { message, model } = req.body;
  let response = await checkInCache(message, model);
  res.json({ success: true, response: response }).status(200);
});
router.post("/addusescache", async (req: Request, res: Response) => {
  console.log("use cache");

  let { message, model } = req.body;
  await addUsesInCache(message, model);
  res.json({ success: true }).status(200);
});

router.get("/cache/:key", async (req: Request, res: Response) => {
  let { key } = req.params;
  let response = await redisClient.get(key);
  res.json({ success: true, response: response }).status(200);
});
router.post("/cache/:key", async (req: Request, res: Response) => {
  let { key } = req.params;
  let { value } = req.body;
  await redisClient.set(key, value);
  res.json({ success: true }).status(200);
});
router.delete("/cache/:key", async (req: Request, res: Response) => {
  let { key } = req.params;
  await redisClient.del(key);
  res.json({ success: true }).status(200);
});

export default router;
