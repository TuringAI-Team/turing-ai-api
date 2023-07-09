import Anthropic from "@anthropic-ai/sdk";
import { EventEmitter } from "events";
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
        options: ["claude-1", "claude-instant-1"],
        default: "claude-instant-1",
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
  },
  execute: async (data) => {
    let { messages, model, max_tokens, temperature, stream } = data;
    if (!model) model = "claude-instant-1";
    if (!max_tokens) max_tokens = 512;
    if (!temperature) temperature = 0.9;
    let prompt = "";
    messages.forEach((message) => {
      if (message.role == "user")
        prompt += `${Anthropic.HUMAN_PROMPT} ${message.content}`;
      else prompt += `${Anthropic.AI_PROMPT} ${message.content}`;
    });
    prompt += `${Anthropic.AI_PROMPT}`;
    if (stream) {
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
          for await (const completion of streamEv) {
            let com: any = completion;
            if (com.stop_reason) {
              com.done = true;
            }
            fullCompletion += com.completion;
            com.completion = fullCompletion;
            event.emit("data", com);
          }
        });
      return event;
    } else {
      const completion = await anthropic.completions.create({
        model: model,
        max_tokens_to_sample: max_tokens,
        prompt: prompt,
      });
      return completion;
    }
  },
};
