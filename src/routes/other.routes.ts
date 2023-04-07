import express from "express";
import { Request, Response } from "express";
import { verify } from "hcaptcha";

const router = express.Router();

router.post("/hcaptcha", async (req: Request, res: Response) => {
  let { token } = req.body;
  const data = await verify(process.env.HCAPTCHA_SECRET, token);
  if (data.success) {
    res.json({ success: true }).status(200);
  } else {
    res.json({ success: false }).status(400);
  }
});

export default router;
