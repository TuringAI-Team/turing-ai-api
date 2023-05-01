import jwt from "jsonwebtoken";
import supabase from "../modules/supabase.js";
import { Request, Response } from "express";

export async function verifyToken(token: string) {
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
      return true;
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
      var isvalid = await verifyToken(token.replaceAll("Bearer ", ""));
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
