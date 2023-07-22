import axios from "axios";
import { EventEmitter } from "events";

export default {
  data: {
    name: "huggingface",
    fullName: "Huggingface based models",
    parameters: {
      messages: {
        type: "array",
        required: false,
      },
      prompt: {
        type: "string",
        required: false,
      },
      chat: {
        type: "boolean",
        required: false,
      },
      model: {
        type: "string",
        required: true,
        options: ["OpenAssistant/oasst-sft-4-pythia-12b-epoch-3.5"],
      },
      stop: {
        type: "string",
        required: false,
      },
    },
  },
  execute: async (data) => {
    let { messages, prompt, chat, model, stop } = data;
    let event = new EventEmitter();
    let result = {
      cost: 0,
      done: false,
      result: "",
    };
    event.emit("data", result);
    if (chat) {
      let prompt = ``;
      let modelInfo = await getModelinfo(model);
      messages.forEach((message) => {
        if (message.role == "user") {
          prompt += `${modelInfo.user}${message.content}${modelInfo.endOfUser}\n`;
        } else {
          prompt += `${modelInfo.stop}${message.content}\n`;
        }
      });
      prompt += `${modelInfo.stop}`;
      let result = huggingface(model, prompt, stop, event);
      return event;
    } else {
      let result = huggingface(model, prompt, stop, event);
      return event;
    }
  },
};

export async function huggingface(model, input, stop, event) {
  let result = {
    cost: 0,
    done: false,
    result: "",
  };
  let oldText;
  let loop = true;
  while (loop) {
    let response = await textGeneration(model, {
      inputs: input,
    });
    let answer = response.generated_text.split(stop)[1];
    if (answer == oldText) {
      loop = false;
      result.done = true;
    } else {
      if (!oldText) {
        oldText = answer;
        input += answer;
      } else {
        oldText += answer;
        input += answer;
      }
    }
    result.result = oldText;
    event.emit("data", result);
  }

  return { result: oldText };
}
export async function textGeneration(model: string, body: object) {
  const response = await axios({
    url: `https://api-inference.huggingface.co/models/${model}`,
    headers: {
      Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    data: JSON.stringify(body),
  });
  return response.data[0];
}

async function getModelinfo(model) {
  switch (model) {
    case "OpenAssistant/oasst-sft-4-pythia-12b-epoch-3.5":
      return {
        stop: "<|assistant|>",
        user: "<|prompter|>",
        endOfUser: "<|endoftext|>",
      };
  }
}
