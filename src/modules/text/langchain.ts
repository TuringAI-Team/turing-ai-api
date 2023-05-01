import { ChatOpenAI } from "langchain/chat_models/openai";
import { HumanChatMessage, SystemChatMessage } from "langchain/schema";
import EventEmitter from "events";

export default async function langchain(model, params) {
  if (model == "chatgpt") {
    var totalMsg = "";
    let event = new EventEmitter();
    const chat = new ChatOpenAI({
      maxTokens: 150,
      temperature: 0.9,
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
    const response = await chat.call([new HumanChatMessage("Tell me a joke.")]);
    console.log({ response });
    return response;
  }
}
