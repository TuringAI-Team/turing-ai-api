import { predict } from "replicate-api";
export default {
  data: {
    name: "controlnet",
    fullName: "Controlnet",
    parameters: {
      prompt: {
        type: "string",
        required: false,
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
        required: false,
      },
    },
  },
  execute: async (data) => {
    let {
      prompt,
      model,
      image,
    }: { prompt: string; model: string; image: any } = data;
    const prediction = await predict({
      model: `jagilley/controlnet-${model}`, // The model name
      input: {
        image: image,
        prompt: prompt,
      }, // The model specific input
      token: process.env.REPLICATE_API_KEY, // You need a token from replicate.com
      poll: true, // Wait for the model to finish
    });

    if (prediction.error) throw new Error(prediction.error);
    return prediction.output;
  },
};
