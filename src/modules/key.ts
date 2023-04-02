import jwt from "jsonwebtoken";
export async function getToken() {
  var token = await jwt.sign(
    { id: "host", key: process.env.SECRETKEY },
    process.env.PRIVATEKEY
  );
  return token;
}

export async function verifyToken(token: string) {
  try {
    var decoded = await jwt.verify(token, process.env.PRIVATEKEY);
    if (decoded && decoded.key == process.env.SECRETKEY) {
      return true;
    }
  } catch (e) {
    console.log(e);
  }
  return false;
}
