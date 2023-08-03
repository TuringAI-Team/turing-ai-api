import delay from "delay";
import { translateModels, request } from "../../utils/runpod.js";
import EventEmitter from "events";
import axios from "axios";

export default {
  data: {
    name: "upscale",
    fullName: "Upscale models",
    parameters: {
      upscaler: {
        type: "string",
        required: false,
        description:
          "Upscaler to use, by selecting this you won't generate any image but you will upscale the image you provide",
        default: "RealESRGAN_x2plus",
        options: [
          "GFPGAN",
          "RealESRGAN_x4plus",
          "RealESRGAN_x2plus",
          "RealESRGAN_x4plus_anime_6B",
          "NMKD_Siax",
          "4x_AnimeSharp",
        ],
      },
      image: {
        type: "string",
        required: true,
        description: "Image URL for the model to use when doing the upscaling",
      },
    },
    response: {
      cost: {
        type: "number",
        description: "Cost of the request in USD",
      },
      result: {
        type: "string",
        description: "Object containing the upscaled image URL",
      },
      status: {
        type: "string",
        description: "Status of the request",
        options: ["queued", "generating", "done"],
      },
      done: {
        type: "boolean",
        description: "Whether the request is done or not",
      },
    },
    pricing: {
      average: 0.01,
    },
  },
  execute: async (data) => {
    if (!data.upscaler) data.upscaler = "RealESRGAN_x2plus";
    let res = await generateAsync(data);
    console.log(res);
    let result: any = {
      id: res.id,
      cost: 10 / 1000,
      status: "generating",
      progress: 0,
    };
    let maxTime = 45;
    if (res.id) {
      let stream = new EventEmitter();
      stream.emit("data", result);
      checkRequest(res.id).then(async (check) => {
        result.progress = ((check.wait_time / maxTime) * 100) / 100;
        if (check.state == "waiting") result.status = "queued";
        if (check.state == "processing") result.status = "generating";
        if (check.state == "done") {
          result.status = "done";
          result.progress = null;
          if (data.upscaler != "caption") {
            let url = check.forms[0].result[data.upscaler];
            let base64;
            let buffer = await axios.get(url, { responseType: "arraybuffer" });
            base64 = Buffer.from(buffer.data, "binary").toString("base64");
            result.result = {
              url: url,
              base64: base64,
            };
          } else {
            result.result = check.forms[0].result.caption;
          }
          stream.emit("data", result);
          return;
        }
      });

      let interval = setInterval(async () => {
        try {
          let check = await checkRequest(res.id);
          result.progress = ((check.wait_time / maxTime) * 100) / 100;
          if (check.state == "waiting") result.status = "queued";
          if (check.state == "processing") result.status = "generating";
          if (check.state == "done") {
            clearInterval(interval);
            result.status = "done";
            result.progress = null;
            if (data.upscaler != "caption") {
              let url = check.forms[0].result[data.upscaler];
              let base64;
              let buffer = await axios.get(url, {
                responseType: "arraybuffer",
              });
              base64 = Buffer.from(buffer.data, "binary").toString("base64");
              result.result = {
                url: url,
                base64: base64,
              };
            } else {
              result.result = check.forms[0].result.caption;
            }
            stream.emit("data", result);
            return;
          }
          stream.emit("data", result);
        } catch (e) {
          clearInterval(interval);
          stream.emit("data", {
            status: "failed",
            error: e,
          });
        }
      }, 10000);
      return stream;
    } else {
      throw new Error("Failed to generate image");
    }
  },
};

async function generateAsync(data) {
  let formatData: any = {
    source_image: data.image,
    slow_workers: false,
    forms: [
      {
        name: data.upscaler,
      },
    ],
  };

  let res = await axios({
    url: `https://stablehorde.net/api/v2/interrogate/async`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apiKey: process.env.STABLE_HORDE,
      Accept: "application/json",
      "Client-Agent": "turing-api:v1.0.0:@mrlol.dev",
    },
    data: formatData,
  });
  return res.data;
}

async function checkRequest(id: string) {
  let res = await axios({
    url: `https://stablehorde.net/api/v2/interrogate/status/${id}`,
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      apiKey: process.env.STABLE_HORDE,
      Accept: "application/json",
      "Client-Agent": "turing-api:v1.0.0:@mrlol.dev",
    },
  });
  return res.data;
}
