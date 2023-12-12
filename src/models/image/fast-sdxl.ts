import axios from "axios";
import { randomUUID } from "crypto";
import { EventEmitter } from "events";
import { predict } from "replicate-api";

export default {
  data: {
    name: "fast_sdxl",
    fullName: "Fast SDXL",
    parameters: {
      prompt: {
        type: "string",
        required: true,
        description: "Prompt to generate the image",
      },
      steps: {
        type: "number",
        required: false,
        default: 4,
      },
      number: {
        type: "number",
        required: false,
        description: "Number of images to generate",
        default: 1,
      },
      negative_prompt: {
        type: "string",
        required: false,
        default:
          "disfigured mouth, disfigured teeth, half head, half face, blury, side looking, old, wrinkle, child, no face, pencil, full body, sharp, far away, overlapping, duplication, nude, disfigured, kitsch, oversaturated, grain, low-res, Deformed, blurry, bad anatomy, poorly drawn face, mutation, mutated, extra limb, ugly, poorly drawn hands, missing limb, blurry, floating limbs, disconnected limbs, malformed hands, blur, out of focus, long body, disgusting, poorly drawn, childish, mutilated, mangled, surreal, out of frame, duplicate, 2 faces",
      },

      width: {
        type: "number",
        required: false,
        default: 1024,
      },
      height: {
        type: "number",
        required: false,
        default: 1024,
      },

      model_version: {
        type: "string",
        required: false,
        default: "lcm",
        options: ["lcm", "turbo"],
      },
      stream: {
        type: "boolean",
        required: false,
        default: true,
      },
    },
    response: {
      cost: {
        type: "number",
        required: true,
      },
      results: {
        type: "array",
        required: true,
      },
      status: {
        type: "string",
        required: true,
      },
      progress: {
        type: "number",
        required: false,
      },
      id: {
        type: "string",
        required: true,
      },
    },
  },
  execute: async (data) => {
    let {
      prompt,
      steps,
      negative_prompt,
      guidance_scale,
      stream,
      model_version,
    } = data;
    if (!negative_prompt)
      negative_prompt =
        "disfigured mouth, disfigured teeth, half head, half face, blury, side looking, old, wrinkle, child, no face, pencil, full body, sharp, far away, overlapping, duplication, nude, disfigured, kitsch, oversaturated, grain, low-res, Deformed, blurry, bad anatomy, poorly drawn face, mutation, mutated, extra limb, ugly, poorly drawn hands, missing limb, blurry, floating limbs, disconnected limbs, malformed hands, blur, out of focus, long body, disgusting, poorly drawn, childish, mutilated, mangled, surreal, out of frame, duplicate, 2 faces";
    let event = null;
    if (!model_version) {
      model_version = "lcm";
    }
    if (stream == null) {
      stream = true;
    }
    let result = {
      cost: null,
      results: [],
      status: "generating",
      progress: 0,
      id: randomUUID(),
      record: null,
    };
    event = new EventEmitter();
    event.emit("data", result);
    //  after 5s change progress to 0.46
    setTimeout(() => {
      if (result.status == "generating") {
        result.progress = 0.46;
        event.emit("data", result);
      }
    }, 5000);

    let start = Date.now();
    predict({
      model: `${model_version == "lcm" ? "lucataco/sdxl-lcm" : "fofr/sdxl-turbo"
        }`, // The model name
      input: {
        prompt: prompt,
        num_inference_steps: steps || 4,
        negative_prompt: negative_prompt,
        num_outputs: data.number || 1,
        width: data.width || 1024,
        height: data.height || 1024,
      }, // The model specific input
      token: process.env.REPLICATE_API_KEY, // You need a token from replicate.com
      poll: true, // Wait for the model to finish
    }).then(async (prediction: any) => {
      if (prediction.error) throw new Error(prediction.error);
      let output = prediction.output;

      let cost = prediction.metrics.predictTime * 0.000725;
      result.cost = cost;
      let res = await axios.get(output[0], {
        responseType: "arraybuffer",
        timeout: 120000,
      });
      let base64 = Buffer.from(res.data, "binary").toString("base64");
      result.results.push({
        base64: base64,
        id: randomUUID(),
        seed: Math.floor(Math.random() * 100000000),
        status: "success",
      });
      result.record = result.results.map((x) => {
        return {
          ...x,
          prompt: prompt,
          negative_prompt: negative_prompt,
          guidance_scale: guidance_scale,
          steps: steps,
          width: data.width || 1024,
          height: data.height || 1024,
          model_version: model_version,
          cost: cost,
        };
      });
      result.status = "done";
      result.progress = null;
      event.emit("data", result);
    }).catch((e) => {
      result.results.push({
        base64: null,
        id: randomUUID(),
        seed: Math.floor(Math.random() * 100000000),
        status: "filtered",
      });
      result.status = "error";
      result.progress = null;
      event.emit("data", result);
    })
    return event;
  },
};
