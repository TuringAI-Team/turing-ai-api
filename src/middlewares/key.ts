import jwt from "jsonwebtoken";
import supabase from "../modules/supabase.js";

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
