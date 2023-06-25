import axios from "axios";

const apiHost = process.env.API_HOST ?? "https://api.stability.ai";

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
  try {
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
  } catch (e) {
    console.log(e);
    return {
      error: e,
    };
  }
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
  try {
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
  } catch (e) {
    console.log(e);
    return {
      error: e,
    };
  }
}

export async function upscale(image: any, width: number, height: number) {
  let data = {
    image: image,
    width: width,
    height: height,
  };
  try {
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
  } catch (e) {
    console.log(e);
    return {
      error: e,
    };
  }
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
  }
}
