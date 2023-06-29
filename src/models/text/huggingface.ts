import axios from "axios";

export default {
  data: {
    name: "huggingface",
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
      let result = await huggingface(model, prompt, stop);
      return result;
    } else {
      let result = await huggingface(model, prompt, stop);
      return result;
    }
  },
};

export async function huggingface(model, input, stop) {
  let oldText;
  let loop = true;
  while (loop) {
    let response = await textGeneration(model, {
      inputs: input,
    });
    let answer = response.generated_text.split(stop)[1];
    if (answer == oldText) {
      loop = false;
    } else {
      if (!oldText) {
        oldText = answer;
        input += answer;
      } else {
        oldText += answer;
        input += answer;
      }
    }
  }

  return { response: oldText };
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
