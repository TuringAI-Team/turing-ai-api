import { request, translateModels } from "../../utils/runpod.js";
import { EventEmitter } from "events";

export default {
  data: {
    name: "music",
    fullName: "Music generation",
    parameters: {
      prompt: {
        type: "string",
        required: true,
      },
      model: {
        type: "string",
        required: false,
        options: ["small", "medium", "melody", "large"],
        default: "small",
      },
      duration: {
        type: "number",
        required: false,
        default: 8,
      },
      stream: {
        type: "boolean",
        required: false,
        default: false,
      },
    },
  },
  execute: async (data) => {
    let { prompt, model, duration, stream } = data;
    if (!model) {
      model = "small";
    }
    if (!duration) {
      duration = 8;
    }
    let url = await translateModels("musicgen");
    let res = await request(url, "run", {
      input: {
        descriptions: [prompt],
        duration: duration,
        modelName: model,
      },
    });
    let emitter = new EventEmitter();
    let id = res.id;
    let result = {
      id: id,
      status: "queued",
      results: [],
      cost: null,
    };
    emitter.emit("data", result);
    let interval = setInterval(async () => {
      let check = await request(url, `status/${id}`, {});
      if (check) {
      }
    }, 1000);
  },
};
