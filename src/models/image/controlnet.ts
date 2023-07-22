import { predict } from "replicate-api";
import { EventEmitter } from "events";

export default {
  data: {
    name: "controlnet",
    fullName: "Controlnet",
    parameters: {
      prompt: {
        type: "string",
        required: true,
      },
      model: {
        type: "string",
        required: true,
        options: [
          "normal",
          "canny",
          "hough",
          "hed",
          "depth2img",
          "pose",
          "seg",
        ],
        default: "normal",
      },
      image: {
        type: "string",
        required: true,
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
      prompt,
      model,
      image,
    }: { prompt: string; model: string; image: any } = data;
    let event = new EventEmitter();
    let result = {
      cost: 0,
      url: "",
      done: false,
    };
    event.emit("data", result);
    predict({
      model: `jagilley/controlnet-${model}`, // The model name
      input: {
        image: image,
        prompt: prompt,
      }, // The model specific input
      token: process.env.REPLICATE_API_KEY, // You need a token from replicate.com
      poll: true, // Wait for the model to finish
    }).then((prediction: any) => {
      if (prediction.error) throw new Error(prediction.error);
      result.url = prediction.output;
      result.done = true;
      result.cost = 0.003;
      event.emit("data", result);
    });
    return event;
  },
};
