import { EventEmitter } from "events";
import axios from "axios";

export default {
  data: {
    name: "sh",
    fullName: "Stablehorde",
    parameters: {
      prompt: {
        type: "string",
        required: true,
        description: "Prompt to generate the image",
      },
      negative_prompt: {
        type: "string",
        required: false,
      },
      image: {
        type: "string",
        required: false,
        description: "Image URL for the model to use when doing img2img",
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
      steps: {
        type: "number",
        required: false,
        default: 50,
      },
      number: {
        type: "number",
        required: false,
        description: "Number of images to generate",
        default: 1,
      },
      strength: {
        type: "number",
        required: false,
      },
      sampler: {
        type: "string",
        required: false,
        options: [
          "k_lms",
          "k_heun",
          "k_euler",
          "k_euler_a",
          "k_dpm_2",
          "k_dpm_2_a",
          "DDIM",
          "k_dpm_fast",
          "k_dpm_adaptive",
          "k_dpmpp_2m",
          "k_dpmpp_2s_a",
          "k_dpmpp_sde",
        ],
      },
      cfg_scale: {
        type: "number",
        required: false,
      },
      seed: {
        type: "number",
        required: false,
      },
      model: {
        type: "string",
        required: false,
        options: [
          "SDXL 1.0",
          "AlbedoBase XL (SDXL)",
          "ICBINP XL",
          "TURBO XL",
          "Fustercluck"
        ],
        default: "SDXL 1.0",
      },
      nsfw: {
        type: "boolean",
        required: false,
        default: false,
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
        description: "Cost of the request in USD",
      },
      id: {
        type: "string",
        description: "ID of the request",
      },
      status: {
        type: "string",
        description: "Status of the request",
        options: ["generating", "queued", "done", "failed"],
      },
      progress: {
        type: "number",
        description: "Progress of the request",
      },
      queue_position: {
        type: "number",
        description: "Queue position of the request",
      },
      results: {
        type: "array",
        description: "Results of the request",
      },
    },
  },
  execute: async (data) => {

    let res = await generateAsync(data);
    let result: any = {
      id: res.id,
      cost: res.kudos / 1000,
      status: "generating",
      progress: 0,
      queue_position: res.queue_position,
      results: [],
      record: null,
    };
    let maxTime = 45;
    if (res.id) {
      let stream = new EventEmitter();
      stream.emit("data", result);
      checkRequest(res.id).then((check) => {
        result.progress = ((check.wait_time / maxTime) * 100) / 100;
        result.queue_position = check.queue_position;
        if (check.queue_position >= 1) result.status = "queued";
        if (check.wait_time == 0) {
          result.status = "generating";
          result.progress = 0.99;
        }
        if (check.done) {
          result.status = "done";
          result.progress = null;
          result.results = check.generations.map((x) => {
            return {
              seed: x.seed,
              id: x.id,
              base64: x.img,
              status: x.censored ? "filtered" : "success",
            };
          });
          result.record = result.results.map((x) => {
            return {
              ...x,
              prompt: data.prompt,
              model: data.model,
              sampler: data.sampler,
              cfg_scale: data.cfg_scale,
              nsfw: data.nsfw,
              width: data.width,
              height: data.height,
              steps: data.steps,
              number: data.number,
              strength: data.strength,
              negative_prompt: data.negative_prompt,
            };
          });
          stream.emit("data", result);
          return;
        }
      });

      let interval = setInterval(async () => {
        try {
          let check = await checkRequest(res.id);
          result.progress = ((check.wait_time / maxTime) * 100) / 100;
          result.wait_time = check.wait_time;
          result.queue_position = check.queue_position;
          if (check.queue_position >= 1) result.status = "queued";
          if (check.wait_time == 0) {
            result.status = "generating";
            result.progress = 0.99;
          }
          if (check.done) {
            result.status = "done";
            result.progress = null;
            result.results = check.generations.map((x) => {
              return {
                seed: x.seed,
                id: x.id,
                base64: x.img,
                status: x.censored ? "filtered" : "success",
              };
            });
            result.record = result.results.map((x) => {
              return {
                ...x,
                prompt: data.prompt,
                model: data.model,
                sampler: data.sampler,
                cfg_scale: data.cfg_scale,
                nsfw: data.nsfw,
                width: data.width,
                height: data.height,
                steps: data.steps,
                number: data.number,
                strength: data.strength,
                negative_prompt: data.negative_prompt,
              };
            });
            clearInterval(interval);
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
    params: {},
  };
  let fullPrompt = data.prompt;
  if (data.negative_prompt) {
    fullPrompt = `${data.prompt} ### ${data.negative_prompt}`;
  }
  formatData.prompt = fullPrompt;
  if (data.image) {
    formatData.source_image = data.image;
    formatData.source_processing = "img2img";
  }
  if (data.sampler) {
    formatData.params.sampler_name = data.sampler;
  }
  if (data.cfg_scale) {
    formatData.params.cfg_scale = data.cfg_scale;
  }
  if (data.seed) {
    formatData.params.seed = data.seed;
  }
  if (data.model) {
    if (data.model == "TURBO XL") {
      formatData.model = "SDXL 1.0";
      formatData.params = {
        ...formatData.params,
        loras: [
          {
            "name": "246747",
            "model": 1,
            "clip": 1,
            "is_version": true
          }
        ]
      }
    } else {
      formatData.models = [data.model];
    }

  } else {
    formatData.models = ["SDXL 1.0"];
  }

  if (data.nsfw) {
    formatData.nsfw = true;
  }
  if (data.width) {
    formatData.params.width = data.width;
  }
  if (data.height) {
    formatData.params.height = data.height;
  }
  if (data.steps) {
    formatData.params.steps = data.steps;
  }
  if (data.number) {
    formatData.params.n = data.number;
  } else {
    formatData.params.n = 1;
    if (data.model.includes("XL")) {
      formatData.params.n = 2;
    }
  }
  if (data.model.includes("XL")) {
    formatData.params.width = 1024;
    formatData.params.height = 1024;
  }
  if (data.strength) {
    formatData.params.denoising_strength = data.strength;
  }
  formatData.shared = true;
  formatData.r2 = false;
  let res = await axios({
    url: `https://stablehorde.net/api/v2/generate/async`,
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
    url: `https://stablehorde.net/api/v2/generate/status/${id}`,
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
