import jwt from "jsonwebtoken";
import supabase from "../db/supabase.js";
import { v4 as uuidv4 } from "uuid";
import redisClient from "../db/redis.js";

export async function pushKeysToCache() {
  let { data, error } = await supabase.from("api_keys").select("*");


  if (data) {
    data.map((d) => {
      redisClient.set(`api:${d["api-token"]}`, JSON.stringify(d));
    });
  }
}

export async function generateKey(
  userId: string,
  name: string,
  allowedPaths?: Array<String>,
  ips?: Array<String>
) {
  let id = uuidv4();
  let apiToken = jwt.sign({ ips, id }, process.env.SECRET_KEY);
  let captchaToken = jwt.sign({ ips, id, apiToken }, process.env.SECRET_KEY);
  let d = {
    id,
    "api-token": apiToken,
    "captcha-token": captchaToken,
    ips,
    created_at: new Date(),
    allowedPaths: allowedPaths || [
      "/text/*",
      "/image/*",
      "/video/*",
      "/audio/*",
    ],
    lastUsed: Date.now(),
    name,
    userId: userId,
  };
  let userExists = await redisClient.get(`users:${userId}`);
  if (!userExists) {
    let { data, error } = await supabase
      .from("users_new")
      .select("*")
      .eq("id", userId);

    if (error) {
      console.log(error);
      return false;
    }
    if (data.length == 0) {
      return false;
    }
    redisClient.set(`users:${userId}`, JSON.stringify(data[0]));
  }
  let { data, error } = await supabase.from("api_keys").insert([
    {
      ...d,
    },
  ]);
  redisClient.set(`api:${apiToken}`, JSON.stringify(d));


  if (error) {
    console.log(error);
    return false;
  }
  return { apiToken, captchaToken, id, name };
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

      var data = req.apiData;
      if (data) {
        var user;
        if (data.userId != "530102778408861706") {
          user = await redisClient.get(`users:${data.userId}`);
          user = JSON.parse(user);
          if (!user) {
            let { data: d, error } = await supabase
              .from("users_new")
              .select("*")
              .eq("id", data.userId);

            if (error) {
              console.log(error);
              return false;
            }
            if (d.length == 0) {
              return false;
            }
            redisClient.set(`users:${data.userId}`, JSON.stringify(d[0]));
            user = d[0];
          }
          if (user?.plan?.total) {
            let current = user.plan.total - user.plan.used;
            if (current <= 0.1) {
              console.log("Plan limit reached");
              return {
                error: "Plan limit reached",
              };
            }
          } else {
            return {
              error: "Plan limit reached",
            };
          }
        } else {
          user = {
            id: "530102778408861706",
          };
        }

        return {
          user: user,
          apiId: data.id,
        };
      }
      return true;
    }
  } catch (e) {
    return false;
  }
}
