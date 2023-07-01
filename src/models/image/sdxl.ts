import log from "../../utils/log.js";
import axios from "axios";
const apiHost = "https://api.stability.ai";

export default {
  data: {
    name: "sdxl",
    fullName: "Stable Diffusion XL",
    parameters: {
      prompts: {
        type: "array",
        required: true,
      },
      image: {
        type: "string",
        required: false,
      },
      action: {
        type: "string",
        required: true,
        options: ["generate", "img2img", "upscale"],
      },
      width: {
        type: "number",
        required: false,
      },
      height: {
        type: "number",
        required: false,
      },
      steps: {
        type: "number",
        required: false,
      },
      number: {
        type: "number",
        required: false,
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
    },
  },
  execute: async (data) => {
    let {
      action,
      prompts,
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
    } = data;
    if (!model) model = "sdxl";
    let response: any = {};
    let originalBalance = await getBalance();
    if (action === "generate") {
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
      response = {
        images: response,
      };
    }
    if (action === "img2img") {
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
    }
    if (action === "upscale") {
      response = await upscale(image, width, height);
    }
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
  let data = {
    text_prompts: prompts,
    init_image: init_image,
  };
  if (steps) data["steps"] = steps;
  if (number) data["samples"] = number;
  if (cfg_scale) data["cfg_scale"] = cfg_scale;
  if (sampler) data["sampler"] = sampler;
  if (strength) data["image_strength"] = strength;
  if (imageMode) data["init_image_mode"] = imageMode;
  if (style_preset) data["style_preset"] = style_preset;
  let response = await axios({
    method: "post",
    url: `${apiHost}/v1/generation/${parseModels(model)}/image-to-image`,
    data: data,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${process.env.DREAMSTUDIO_KEY}`,
    },
  });
  return response.data;
}

export async function upscale(image: any, width: number, height: number) {
  let data = {
    image: image,
    width: width,
    height: height,
  };
  let response = await axios({
    method: "post",
    url: `${apiHost}/v1/generation/esrgan-v1-x2plus/image-to-image`,
    data: data,
    headers: {
      "Content-Type": "application/json",
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
      return "stable-diffusion-xl-beta-v2-2-2";
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
