import { Configuration, OpenAIApi } from "openai";
import { EventEmitter } from "events";
import { randomUUID } from "crypto";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_KEY,
});
const openai = new OpenAIApi(configuration);

export default {
  data: {
    name: "dall-e",
    fullName: "Dall-e 2",
    parameters: {
      prompt: {
        type: "string",
        required: false,
      },
      number: {
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
        description: "Image you want to vary",
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
      number,
      size,
      image,
    }: {
      prompt: string;
      number: number;
      size: any;
      image: File;
    } = data;
    let event = new EventEmitter();
    let result = {
      cost: null,
      results: [],
      status: "generating",
      progress: 0,
      id: randomUUID(),
      done: false,
    };
    event.emit("data", result);
    if (size == "512x512") result.cost = 0.018;
    if (size == "256x256") result.cost = 0.016;
    if (size == "1024x1024") result.cost = 0.02;

    if (!image) {
      openai
        .createImage({
          prompt,
          n: number,
          size,
        })
        .then((res) => {
          var imagesArr = res.data.data.map((d, i) => {
            return {
              attachment: d.url,
              name: `result-${i}.png`,
              id: randomUUID(),
            };
          });
          result.results = imagesArr;
          result.status = "done";
          result.progress = null;
          result.done = true;
          event.emit("data", result);
        });

      return event;
    } else {
      openai.createImageVariation(image, number, size).then((res) => {
        var imagesArr = res.data.data.map((d, i) => {
          return {
            attachment: d.url,
            name: `result-${i}.png`,
            id: randomUUID(),
          };
        });
        result.results = imagesArr;
        result.status = "done";
        result.progress = null;
        result.done = true;
        event.emit("data", result);
      });

      return event;
    }
  },
};
