export default async function (req, res, next) {
  //  captcha token is on headers
  const token = req.headers["x-captcha-token"];
  if (!token) {
    return res.status(400).json({ error: "Captcha token is required" });
  }
  try {
    const data = await validate(process.env.TURNSTILE_SECRET, token);
    console.log(data);
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

  var res = await fetch(API_URL, {
    body: formData,
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
  } = await res.json();
  /* Error descriptions */
  var error = data["error-codes"][0];
  if (error) {
    switch (error) {
      case "missing-input-secret":
        return {
          errorDescription: "The secret parameter was not passed.",
          ...data,
        };
      case "invalid-input-secret":
        return {
          errorDescription:
            "The secret parameter was invalid or did not exist.",
          ...data,
        };
      case "missing-input-response":
        return {
          errorDescription: "The response(token) parameter was not passed.",
          ...data,
        };
      case "invalid-input-response":
        return {
          errorDescription:
            "The response(token) parameter is invalid or has expired.",
          ...data,
        };
      case "bad-request":
        return {
          errorDescription:
            "The request was rejected because it was malformed.",
          ...data,
        };
      case "timeout-or-duplicate":
        return {
          errorDescription:
            "The response parameter has already been validated before.",
          ...data,
        };
      case "internal-error":
        return {
          errorDescription:
            "An internal error happened while validating the response. The request can be retried.",
          ...data,
        };
    }
  }
  return data;
}
