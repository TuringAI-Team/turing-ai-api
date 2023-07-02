import { Configuration, OpenAIApi } from "openai";

export default {
  data: {
    name: "dall-e",
    fullName: "Dall-e 2",
    parameters: {
      prompt: {
        type: "string",
        required: false,
      },
      samples: {
        type: "number",
        required: true,
        options: [1, 2, 3, 4],
      },
      size: {
        type: "string",
        required: false,
        options: ["512x512", "256x256", "1024x1024"],
        default: "512x512",
      },
      image: {
        type: "string",
        required: false,
      },
    },
  },
  execute: async (data) => {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_KEY,
    });
    const openai = new OpenAIApi(configuration);
    let {
      prompt,
      samples,
      size,
      image,
    }: {
      prompt: string;
      samples: number;
      size: any;
      image: File;
    } = data;
    let response;
    if (!image) {
      response = await openai.createImage({
        prompt,
        n: samples,
        size,
      });
      var imagesArr = response.data.data.map((d, i) => {
        return { attachment: d.url, name: `result-${i}.png` };
      });
      return { images: imagesArr };
    } else {
      response = await openai.createImageVariation(image, samples, size);
      var imagesArr = response.data.data.map((d, i) => {
        return { attachment: d.url, name: `result-${i}.png` };
      });
      return { images: imagesArr };
    }
  },
};
