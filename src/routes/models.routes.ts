import express from "express";
import { Request, Response } from "express";
import turnstile from "../middlewares/captchas/turnstile.js";
import key from "../middlewares/key.js";
import client from "../index.js";
import log from "../utils/log.js";

const router = express.Router();

router.post(
  "/:type/:ai",
  key,
  turnstile,
  async (req: Request, res: Response) => {
    const { type, ai } = req.params;
    const body = req.body;
    let typeObj = client[type];
    if (!typeObj) {
      res.status(404).json({ success: false, error: "Type not found" });
      return;
    }
    try {
      let aiObject = typeObj.find((a) => a.data.name === ai);
      if (!aiObject) {
        log("info", `AI not found: ${ai}`, typeObj);
        res.status(404).json({ success: false, error: "AI not found" });
        return;
      }
      // check params and body
      let realParameters = aiObject.data.parameters; // is an object with keys as parameter names and values as parameter types
      let parameters = Object.keys(realParameters);
      let requiredParams = parameters.filter(
        (p) => realParameters[p].required === true
      );
      let bodyKeys = Object.keys(body);
      // check if all required params are in body
      let missingParams = requiredParams.filter((p) => !bodyKeys.includes(p));
      if (missingParams.length > 0) {
        res.status(400).json({
          success: false,
          error: `Missing parameters: ${missingParams.join(", ")}`,
        });
        return;
      }

      // not existing params
      let notExistingParams = bodyKeys.filter((p) => !parameters.includes(p));
      if (notExistingParams.length > 0) {
        res.status(400).json({
          success: false,
          error: `Not existing parameters: ${notExistingParams.join(", ")}`,
        });
        return;
      }
      let execution = await aiObject.execute(body);
      if (body.stream) {
        res.set("content-type", "text/event-stream");
        if (aiObject.name == "gpt") {
          execution.on("data", (data) => res.write(data));
          execution.on("end", () => res.end());
        } else {
          execution.on("data", (data) => {
            res.write("data: " + JSON.stringify(data) + "\n\n");
            if (data.done) {
              res.end();
            }
          });
        }
      } else {
        res.status(200).json({ success: true, ...execution });
      }
    } catch (error: any) {
      let resultError = error;
      if (error.response && error.response.data) {
        resultError = error.response.data;
      }
      console.log(resultError);
      res.status(500).json({ success: false, error: resultError });
    }
  }
);
router.get("/", (req, res) => {
  res.json({ success: true, message: "Welcome to the API, docs at /docs" });
});

export default router;
