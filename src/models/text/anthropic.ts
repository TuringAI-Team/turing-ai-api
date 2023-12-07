import Anthropic from "@anthropic-ai/sdk";
import { EventEmitter } from "events";
import { getPromptLength } from "../../utils/tokenizer.js";
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default {
  data: {
    name: "anthropic",
    fullName: "Anthropic Models",
    disabled: true,
    parameters: {
      messages: {
        type: "array",
        required: true,
      },
      model: {
        type: "string",
        required: false,
        options: ["claude-instant-1.2", "claude-2.1"],
        default: "claude-instant-1.2",
      },
      max_tokens: {
        type: "number",
        required: false,
        default: 512,
      },
      temperature: {
        type: "number",
        required: false,
        default: 0.9,
      },
      stream: {
        type: "boolean",
        required: false,
        default: false,
      },
    },
    response: {
      cost: {
        type: "number",
        description: "Cost of the request in USD",
      },
      result: {
        type: "string",
        description: "Result of the request",
      },
    },
  },
  execute: async (data) => {
    let { messages, model, max_tokens, temperature, stream } = data;
    if (!model) model = "claude-instant-1.2";
    if (!max_tokens) max_tokens = 512;
    if (!temperature) temperature = 0.9;
    let prompt = "";
    messages.forEach((message) => {
      if (message.role == "user")
        prompt += `${Anthropic.HUMAN_PROMPT} ${message.content}`;
      else prompt += `${Anthropic.AI_PROMPT} ${message.content}`;
    });
    prompt += `${Anthropic.AI_PROMPT}`;
    const event = new EventEmitter();
    anthropic.completions
      .create({
        model: model,
        max_tokens_to_sample: max_tokens,
        prompt: prompt,
        stream: true,
      })
      .then(async (streamEv) => {
        let fullCompletion = "";
        let num = 0;
        for await (const completion of streamEv) {
          let com: any = completion;
          num++;
          if (com.stop_reason) {
            com.done = true;
            let promptTokens = getPromptLength(prompt);
            let completionTokens = getPromptLength(com.result);
            let pricePerK = {
              prompt: 1.63,
              completion: 5.51,
            };
            if (!model.includes("instant")) {
              pricePerK.prompt = 11.02;
              pricePerK.completion = 32.68;
            }
            let promptCost = (promptTokens / 1000000) * pricePerK.prompt;
            let completionCOst =
              (completionTokens / 1000000) * pricePerK.completion;
            com.cost = promptCost + completionCOst;
          }
          fullCompletion += com.completion;
          com.completion = fullCompletion;
          com.result = fullCompletion;
          if (num >= 10 || com.stop_reason) {
            event.emit("data", com);
          }
        }
      });
    return event;
  },
};
