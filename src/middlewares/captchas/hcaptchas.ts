import { verify } from "hcaptcha";
import { checkCaptchaToken } from "../../utils/key.js";

export default async function (req, res, next) {
  //  captcha token is on headers
  const token = req.headers["x-captcha-token"];
  if (!token) {
    return res.status(400).json({ error: "Captcha token is required" });
  }
  try {
    let valid = await checkCaptchaToken(token, req);
    if (valid) {
      return next();
    }
    const data = await verify(process.env.HCAPTCHA_SECRET as string, token);
    if (data.success) {
      return next();
    }
    return res.status(400).json({ error: "Invalid captcha" });
  } catch (err) {
    return res.status(400).json({ error: "Invalid captcha" });
  }
}
