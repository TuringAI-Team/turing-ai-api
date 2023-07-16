import jwt from "jsonwebtoken";
import supabase from "../db/supabase.js";
import { Request, Response } from "express";
import redisClient from "../db/redis.js";

export async function verifyToken(token: string, req) {
  // verify token
  try {
    let decoded = jwt.verify(token, process.env.SECRET_KEY);
    if (!decoded) {
      // decode supabase access token
      const { data, error } = await supabase.auth.getUser(token);
      if (error) {
        console.log(error);
        return false;
      }
      return true;
    } else {
      let data: any = await redisClient.get(`api:${token}`);
      data = JSON.parse(data);
      if (!data) {
        return false;
      }
      if (data.allowedPaths) {
        let allowed = false;
        if (data.allowedPaths.find((path) => path == "*")) {
          allowed = true;
        } else {
          for (let path of data.allowedPaths) {
            path = path.replace("*", "");
            if (req.path.startsWith(path)) {
              allowed = true;
            }
          }
        }
        if (!allowed) {
          return {
            error: "You don't have permissions to use this endpoint",
          };
        }
      }
      return {
        apiData: data,
      };
    }
  } catch (err) {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      console.log(error);
      return false;
    }
    return true;
  }
}
export default async (req: Request, res: Response, next) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization;
    if (token) {
      var isvalid: any = await verifyToken(
        token.replaceAll("Bearer ", ""),
        req
      );
      if (isvalid.error) {
        res.status(401).send({ error: isvalid.error });
        return;
      }
      if (isvalid.apiData) {
        req.apiData = isvalid.apiData;
        next();
        return;
      }
      if (isvalid) {
        next();
      } else {
        res.status(401).send({ error: "Unauthorized" });
      }
    } else {
      res.status(401).send({ error: "Unauthorized" });
    }
  } else {
    res.status(401).send({ error: "Unauthorized" });
  }
};
