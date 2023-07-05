import log from "../../utils/log.js";
import axios from "axios";
const apiHost = "https://api.stability.ai";
import FormData from "form-data";
import { EventEmitter } from "events";

export default {
  data: {
    name: "sdxl",
    fullName: "Stable Diffusion XL",
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
      action: {
        type: "string",
        required: true,
        options: ["generate", "img2img", "upscale"],
        default: "generate",
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
        default: 100,
      },
      number: {
        type: "number",
        required: false,
        default: 1,
      },
      sampler: {
        type: "string",
        required: false,
        options: [
          "DDIM",
          "DDPM",
          "K_DPMPP_2M",
          "K_DPMPP_2S_ANCESTRAL",
          "K_DPM_2",
          "K_DPM_2_ANCESTRAL",
          "K_EULER",
          "K_EULER_ANCESTRAL",
          "K_HEUN",
          "K_LMS",
        ],
      },
      cfg_scale: {
        type: "number",
        required: false,
        default: 7,
      },
      seed: {
        type: "number",
        required: false,
      },
      style: {
        type: "string",
        required: false,
        options: [
          "3d-model",
          "analog-film",
          "anime",
          "cinematic",
          "comic-book",
          "digital-art",
          "enhance",
          "fantasy-art",
          "isometric",
          "line-art",
          "low-poly",
          "modeling-compound",
          "neon-punk",
          "origami",
          "photographic",
          "pixel-art",
          "title-texture",
        ],
      },
      model: {
        type: "string",
        required: false,
        options: [
          "sdxl",
          "sd-1.5",
          "sd",
          "sd-768",
          "stable-diffusion-xl-1024-v0-9",
          "stable-diffusion-v1",
          "stable-diffusion-v1-5",
          "stable-diffusion-512-v2-0",
          "stable-diffusion-768-v2-0",
          "stable-diffusion-depth-v2-0",
          "stable-diffusion-512-v2-1",
          "stable-diffusion-768-v2-1",
          "stable-diffusion-xl-beta-v2-2-2",
        ],
        default: "sdxl",
      },
      strength: {
        type: "number",
        required: false,
      },
      stream: {
        type: "boolean",
        required: false,
        default: false,
      },
    },
  },
  execute: async (data) => {
    let {
      action,
      image,
      model,
      style,
      seed,
      cfg_scale,
      steps,
      sampler,
      width,
      height,
      number,
      strength,
      stream,
    } = data;
    if (!model) model = "sdxl";
    let response: any = {};
    let prompts = [];
    if (data.prompt)
      prompts.push({
        text: data.prompt,
        weight: 0.5,
      });
    if (data.negative_prompt)
      prompts.push({
        text: data.negative_prompt,
        weight: -1,
      });
    let event;
    let result = {
      cost: null,
      results: [],
      status: "generating",
      progress: 0,
    };
    if (stream) {
      event = new EventEmitter();
      event.emit("data", result);
      //  after 5s change progress to 0.46
      setTimeout(() => {
        result.progress = 0.46;
        event.emit("data", result);
      }, 5000);
    }
    let originalBalance = await getBalance();
    if (action === "generate") {
      if (!stream) {
        response = await generate(
          prompts,
          model,
          width,
          height,
          steps,
          number,
          cfg_scale,
          sampler,
          seed,
          style
        );
        response = response.artifacts;
        let newBalance = await getBalance();
        let cost = (originalBalance - newBalance) / 100;
        return { ...response, cost };
      } else {
        generate(
          prompts,
          model,
          width,
          height,
          steps,
          number,
          cfg_scale,
          sampler,
          seed,
          style
        ).then(async (response) => {
          result.results = response.artifacts;
          let newBalance = await getBalance();
          let cost = (originalBalance - newBalance) / 100;
          result.cost = cost;
          result.status = "success";
          event.emit("data", result);
        });
        return event;
      }
    }
    if (image) {
      // image i s base64, transforming to binary
      image = Buffer.from(image, "base64");
    }
    if (action === "img2img") {
      if (!stream) {
        response = await img2img(
          prompts,
          model,
          image,
          strength,
          number,
          steps,
          "image_strength",
          style,
          cfg_scale,
          sampler
        );
      } else {
        img2img(
          prompts,
          model,
          image,
          strength,
          number,
          steps,
          "image_strength",
          style,
          cfg_scale,
          sampler
        ).then(async (response) => {
          result.results = response.artifacts;
          let newBalance = await getBalance();
          let cost = (originalBalance - newBalance) / 100;
          result.cost = cost;
          result.status = "success";
          event.emit("data", result);
        });
      }
    }
    if (action === "upscale") {
      if (!stream) {
        response = await upscale(image, width, height);
      } else {
        upscale(image, width, height).then(async (response) => {
          result.results = response.artifacts;
          let newBalance = await getBalance();
          let cost = (originalBalance - newBalance) / 100;
          result.cost = cost;
          result.status = "success";
          event.emit("data", result);
        });
      }
    }
    response = response.artifacts;
    response = {
      images: response,
    };
    let newBalance = await getBalance();
    let cost = (originalBalance - newBalance) / 100;
    return { ...response, cost };
  },
};

export async function generate(
  prompts: any[],
  model: string,
  width?: number,
  height?: number,
  steps?: number,
  number?: number,
  cfg_scale?: number,
  sampler?: string,
  seed?: number,
  style?: string
) {
  let data = {
    text_prompts: prompts,
  };
  if (width) data["width"] = width;
  if (height) data["height"] = height;
  if (steps) data["steps"] = steps;
  if (number) data["samples"] = number;
  if (cfg_scale) data["cfg_scale"] = cfg_scale;
  if (sampler) data["sampler"] = sampler;
  if (seed) data["seed"] = seed;
  if (style) data["style_preset"] = style;
  let response = await axios({
    method: "post",
    url: `${apiHost}/v1/generation/${parseModels(model)}/text-to-image`,
    data: data,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${process.env.DREAMSTUDIO_KEY}`,
    },
  });
  return response.data;
}

export async function img2img(
  prompts: any[],
  model: string,
  init_image: any,
  strength?: number,
  number?: number,
  steps?: number,
  imageMode?: string,
  style_preset?: string,
  cfg_scale?: number,
  sampler?: string
) {
  const formData = new FormData();
  formData.append("init_image", init_image);
  formData.append("text_prompts[0][text]", prompts[0]["text"]);
  if (prompts[1]) {
    formData.append("text_prompts[1][text]", prompts[1]["text"]);
  }
  if (steps) {
    formData.append("steps", steps);
  }
  if (number) {
    formData.append("samples", number);
  }
  if (cfg_scale) {
    formData.append("cfg_scale", cfg_scale);
  }
  if (sampler) {
    formData.append("sampler", sampler);
  }
  if (strength) {
    formData.append("image_strength", strength);
  }
  if (imageMode) {
    formData.append("init_image_mode", imageMode);
  }
  if (style_preset) {
    formData.append("style_preset", style_preset);
  }

  let response = await axios({
    method: "post",
    url: `${apiHost}/v1/generation/${parseModels(model)}/image-to-image`,
    headers: {
      ...formData.getHeaders(),
      Accept: "application/json",
      Authorization: `Bearer ${process.env.DREAMSTUDIO_KEY}`,
    },
    data: formData,
  });
  return response.data;
}

export async function upscale(image: any, width: number, height: number) {
  const formData = new FormData();
  formData.append("image", image);
  if (width) {
    formData.append("width", width);
  }
  let response = await axios({
    method: "post",
    url: `${apiHost}/v1/generation/esrgan-v1-x2plus/image-to-image/upscale`,
    data: formData,
    headers: {
      ...formData.getHeaders(),
      Accept: "application/json",
      Authorization: `Bearer ${process.env.DREAMSTUDIO_KEY}`,
    },
  });
  return response.data;
}

export async function getBalance() {
  let response = await axios({
    method: "get",
    url: `${apiHost}/v1/user/balance`,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${process.env.DREAMSTUDIO_KEY}`,
    },
  });
  return response.data.credits;
}

function parseModels(model: string) {
  switch (model) {
    case "sdxl":
      return "stable-diffusion-512-v2-1";
    case "sd-1.5":
      return "stable-diffusion-v1-5";
    case "sd":
      return "stable-diffusion-512-v2-1";
    case "sd-768":
      return "stable-diffusion-768-v2-1";
    default:
      return model;
  }
}
