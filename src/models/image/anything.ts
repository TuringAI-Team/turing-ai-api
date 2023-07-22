import axios from "axios";
import { randomUUID } from "crypto";
import { EventEmitter } from "events";
export default {
  data: {
    name: "anything",
    fullName: "Anything models",
    parameters: {
      prompt: {
        type: "string",
        required: true,
        description: "Prompt to generate the image",
      },
      steps: {
        type: "number",
        required: false,
        default: 100,
      },
      number: {
        type: "number",
        required: false,
        default: 1,
      },
      negative_prompt: {
        type: "string",
        required: false,
        default:
          "disfigured mouth, disfigured teeth, half head, half face, blury, side looking, old, wrinkle, child, no face, pencil, full body, sharp, far away, overlapping, duplication, nude, disfigured, kitsch, oversaturated, grain, low-res, Deformed, blurry, bad anatomy, poorly drawn face, mutation, mutated, extra limb, ugly, poorly drawn hands, missing limb, blurry, floating limbs, disconnected limbs, malformed hands, blur, out of focus, long body, disgusting, poorly drawn, childish, mutilated, mangled, surreal, out of frame, duplicate, 2 faces",
      },
      guidance_scale: {
        type: "number",
        required: false,
        default: 4,
      },
      width: {
        type: "number",
        required: false,
        default: 512,
      },
      height: {
        type: "number",
        required: false,
        default: 512,
      },
      cfg_scale: {
        type: "number",
        required: false,
        default: 4,
      },
      stream: {
        type: "boolean",
        required: false,
        default: true,
      },
    },
  },
  execute: async (data) => {
    let { prompt, steps, negative_prompt, guidance_scale, stream } = data;
    if (!negative_prompt)
      negative_prompt =
        "disfigured mouth, disfigured teeth, half head, half face, blury, side looking, old, wrinkle, child, no face, pencil, full body, sharp, far away, overlapping, duplication, nude, disfigured, kitsch, oversaturated, grain, low-res, Deformed, blurry, bad anatomy, poorly drawn face, mutation, mutated, extra limb, ugly, poorly drawn hands, missing limb, blurry, floating limbs, disconnected limbs, malformed hands, blur, out of focus, long body, disgusting, poorly drawn, childish, mutilated, mangled, surreal, out of frame, duplicate, 2 faces";
    let event = null;
    if (stream == null) {
      stream = true;
    }
    let result = {
      cost: null,
      results: [],
      status: "generating",
      progress: 0,
      id: randomUUID(),
    };
    event = new EventEmitter();
    event.emit("data", result);
    //  after 5s change progress to 0.46
    setTimeout(() => {
      result.progress = 0.46;
      event.emit("data", result);
    }, 5000);
    //  after 10s change progress to 0.92
    setTimeout(() => {
      result.progress = 0.92;
      event.emit("data", result);
    }, 10000);
    let start = Date.now();

    axios({
      url: "https://api.runpod.ai/v2/sd-anything-v4/runsync",
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RUNPOD_KEY}`,
      },
      data: {
        input: {
          prompt: prompt,
          num_inference_steps: steps || 50,
          guidance_scale: guidance_scale,
          negative_prompt: negative_prompt,
          num_outputs: data.number || 1,
          width: data.width || 512,
          height: data.height || 512,
        },
      },
    }).then(async (response) => {
      let spentInSec = (Date.now() - start) / 1000;
      let cost = spentInSec * 0.00025;
      result.cost = cost;
      if (data.number && data.number > 1) {
        result.results = await Promise.all(
          response.data.output.map(async (x) => {
            let res = await axios.get(x.image, {
              responseType: "arraybuffer",
              // change time out to 2 min
              timeout: 120000,
            });
            let base64 = Buffer.from(res.data, "binary").toString("base64");
            return {
              base64: base64,
              id: randomUUID(),
              seed: x.seed,
              status: "success",
            };
          })
        );
      } else {
        let res = await axios.get(response.data.output.image, {
          responseType: "arraybuffer",
          timeout: 120000,
        });
        let base64 = Buffer.from(res.data, "binary").toString("base64");
        result.results.push({
          base64: base64,
          id: randomUUID(),
          seed: response.data.output.seed,
          status: "success",
        });
      }
      result.status = "done";
      result.progress = null;
      event.emit("data", result);
    });
    return event;
  },
};
