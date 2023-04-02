import jwt from "jsonwebtoken";
import supabase from "./supabase.js";
export async function getToken() {
  var token = await jwt.sign(
    { id: "host", key: process.env.SECRETKEY },
    process.env.PRIVATEKEY
  );
  return token;
}

export async function verifyToken(token: string) {
  if (token == process.env.BOTS) return true;
  // decode supabase access token
  const { data, error } = await supabase.auth.getUser(token);
  if (error) {
    console.log(error);
    return false;
  }
  return true;
}
