import delay from "delay";
import { translateModels, request } from "../../utils/runpod.js";
import EventEmitter from "events";

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
        default: "RealESRGAN_x4plus",
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
  },
  execute: async (data) => {
    const event = new EventEmitter();
    let { image, upscaler } = data;
    return event;
  },
};
