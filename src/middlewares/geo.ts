import axios from "axios";
import { Request, Response, NextFunction } from "express";

export default async function geo(req: any, res: Response, next: NextFunction) {
  var ip =
    (req.headers["x-forwarded-for"] as string) ||
    (req.socket.remoteAddress as string);
  ip = ip.split(", ")[1];
  try {
    const apiUrl = `http://ip-api.com/json/${ip}`;
    const { data } = await axios.get(apiUrl);
    req.geo = data;
    // log geo and user agent
    console.log(data, req.headers["user-agent"]);
    next();
  } catch (error) {
    console.log(error);
    req.geo = {
      country_name: "Unknown",
    };
    next();
  }
}
