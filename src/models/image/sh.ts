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
      },
      negative_prompt: {
        type: "string",
        required: false,
      },
      image: {
        type: "string",
        required: false,
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
          "Deliberate",
          "Anything Diffusion",
          "stable_diffusion",
          "ICBINP - I Can't Believe It's Not Photography",
          "ChilloutMix",
          "majicMIX realistic",
          "Dreamshaper",
          "URPM",
          "Hentai Diffusion",
          "CamelliaMix 2.5D",
          "BB95 Furry Mix",
          "Counterfeit",
          "iCoMix",
          "Abyss OrangeMix",
          "Realistic Vision",
          "BRA",
          "Epic Diffusion",
          "GTA5 Artwork Diffusion",
          "Liberty",
          "RealBiter",
          "Zeipher Female Model",
          "Analog Madness",
          "stable_diffusion_2.1",
          "HRL",
          "Rev Animated",
          "Anygen",
          "Furry Epoch",
          "Neurogen",
          "Hassanblend",
          "Dreamlike Photoreal",
          "Project Unreal Engine 5",
          "Arcane Diffusion",
          "OpenJourney Diffusion",
          "SDXL_beta::stability.ai#6901",
        ],
        default: "stable_diffusion",
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
    };
    console.log(res);
    let maxTime = 30;
    if (res.id) {
      if (data.stream == null) data.stream = true;
      if (data.stream) {
        let stream = new EventEmitter();
        stream.emit("data", result);
        checkRequest(res.id).then((check) => {
          result.progress = ((check.wait_time / maxTime) * 100) / 100;
          result.queue_position = check.queue_position;
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
            stream.emit("data", result);
            return;
          }
        });

        let interval = setInterval(async () => {
          let check = await checkRequest(res.id);
          result.wait_time = check.wait_time;
          result.queue_position = check.queue_position;
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
            clearInterval(interval);
          }
          stream.emit("data", result);
        }, 10000);
        return stream;
      } else {
        let check = await checkRequest(res.id);
        result.wait_time = check.wait_time;
        result.queue_position = check.queue_position;

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
          return result;
        }
        while (!result.done) {
          let check = await checkRequest(res.id);
          result.wait_time = check.wait_time;
          result.queue_position = check.queue_position;
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
            return result;
          }
        }
        return result;
      }
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
    formatData.models = [data.model];
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
    if (data.model.includes("SDXL")) {
      formatData.params.n = 2;
    }
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
