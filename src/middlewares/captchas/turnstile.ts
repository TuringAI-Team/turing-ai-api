import axios from "axios";
import { checkCaptchaToken } from "../../modules/keys.js";
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
    const data = await validate(process.env.TURNSTILE_SECRET, token);
    if (data.success) {
      return next();
    }
    return res.status(400).json({ error: "Invalid captcha" });
  } catch (err) {
    console.log(err);
    return res.status(400).json({ error: "Invalid captcha" });
  }
}
const API_URL: string =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
async function validate(secret: string, token: string, ip?: string) {
  let formData = new URLSearchParams();
  formData.append("secret", secret);
  formData.append("response", token);
  if (ip) {
    formData.append("remoteip", ip);
  }

  var res = await axios({
    url: API_URL,
    data: formData,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  var data: {
    success: boolean;
    "error-codes": Array<string>;
    challenge_ts?: string;
    hostname?: string;
    action?: string;
    cdata?: string;
  } = res.data;
  /* Error descriptions */
  var error = data["error-codes"][0];
  if (error) {
    switch (error) {
      case "missing-input-secret":
        return {
          error: "The secret parameter was not passed.",
          ...data,
        };
      case "invalid-input-secret":
        return {
          error: "The secret parameter was invalid or did not exist.",
          ...data,
        };
      case "missing-input-response":
        return {
          error: "The response(token) parameter was not passed.",
          ...data,
        };
      case "invalid-input-response":
        return {
          error: "The response(token) parameter is invalid or has expired.",
          ...data,
        };
      case "bad-request":
        return {
          error: "The request was rejected because it was malformed.",
          ...data,
        };
      case "timeout-or-duplicate":
        return {
          error: "The response parameter has already been validated before.",
          ...data,
        };
      case "internal-error":
        return {
          error:
            "An internal error happened while validating the response. The request can be retried.",
          ...data,
        };
    }
  }
  return data;
}
