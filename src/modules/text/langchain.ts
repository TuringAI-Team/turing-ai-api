import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  HumanChatMessage,
  SystemChatMessage,
  AIChatMessage,
} from "langchain/schema";
import EventEmitter from "events";

export default async function langchain(
  model,
  messages,
  maxTokens,
  temperature
) {
  if (model == "chatgpt") {
    var totalMsg = "";
    let event = new EventEmitter();
    const chat = new ChatOpenAI({
      maxTokens: maxTokens,
      temperature: temperature,
      openAIApiKey: process.env.OPENAI_API_KEY,
      streaming: true,
      callbacks: [
        {
          handleLLMNewToken(token: string) {
            totalMsg += token;
            event.emit("token", token);
          },
        },
      ],
    });
    const response = await chat.call(
      messages.map((x) => {
        if (x.role == "user") {
          return new HumanChatMessage(x.content);
        } else if (x.role == "system") {
          return new SystemChatMessage(x.content);
        } else if (x.role == "assistant") {
          return new AIChatMessage(x.content);
        }
      })
    );
    console.log({ response });
    return response;
  }
  if (model == "chatgpt-plugins") {
  }
}
