import jwt from "jsonwebtoken";
import supabase from "../modules/supabase.js";
import { v4 as uuidv4 } from "uuid";

export async function generateKey(ips?: Array<String>) {
  let id = uuidv4();
  let apiToken = jwt.sign({ ips, id }, process.env.SECRET_KEY);
  let captchaToken = jwt.sign({ ips, id, apiToken }, process.env.SECRET_KEY);
  let { data, error } = await supabase.from("api_keys").insert([
    {
      id,
      "api-token": apiToken,
      "captcha-token": captchaToken,
      ips,
      created_at: new Date(),
      lastUsed: Date.now(),
    },
  ]);
  if (error) {
    console.log(error);
    return false;
  }
  return { apiToken, captchaToken };
}

export async function checkCaptchaToken(token: string, req) {
  try {
    let decoded = jwt.verify(token, process.env.SECRET_KEY);
    let ApiToken = req.headers.authorization;
    ApiToken = ApiToken.replace("Bearer ", "");
    if (!decoded) {
      return false;
    }
    if (decoded["apiToken"]) {
      if (decoded["apiToken"] != ApiToken) {
        return false;
      }
      let decodedApiToken = jwt.verify(
        decoded["apiToken"],
        process.env.SECRET_KEY
      );
      if (!decodedApiToken) {
        return false;
      }
      if (decodedApiToken["id"] != decoded["id"]) {
        return false;
      }
      // check ip
      if (decodedApiToken["ips"]) {
        if (
          !decodedApiToken["ips"].includes(req.ip) &&
          req.ip != "::1" &&
          decodedApiToken["ips"].length > 0
        ) {
          return false;
        }
      }

      return true;
    }
  } catch (e) {
    return false;
  }
}
