import express from "express";
import turnstile from "../middlewares/captchas/turnstile.js";
import key from "../middlewares/key.js";
import * as fs from "fs";

const storagePath = "./storage";

const router = express.Router();

router.post("/upload", key, turnstile, async (req, res) => {
  let { base64, name, bucket } = req.body;
  let buffer = Buffer.from(base64, "base64");
  let path = `${storagePath}/${bucket}/${name}`;
  fs.writeFileSync(path, buffer);
  res.json({ success: true });
});

router.get("/:bucket/:name", async (req, res) => {
  let { bucket, name } = req.params;
  let path = `${storagePath}/${bucket}/${name}`;
  let file = fs.readFileSync(path);
  res.send(file);
});
export default router;
