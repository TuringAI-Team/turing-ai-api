import express from "express";
import turnstile from "../middlewares/captchas/turnstile.js";
import key from "../middlewares/key.js";
import * as fs from "fs";

const router = express.Router();

export default router;
