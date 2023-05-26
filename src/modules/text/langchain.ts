import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  HumanChatMessage,
  SystemChatMessage,
  AIChatMessage,
} from "langchain/schema";
import plugins from "./plugins.js";
import EventEmitter from "events";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { PromptTemplate } from "langchain/prompts";
import {
  RequestsGetTool,
  RequestsPostTool,
  AIPluginTool,
} from "langchain/tools";

export default async function langchain(
  model,
  messages,
  maxTokens,
  temperature,
  pluginList?
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
  if (model == "chatgpt-plugins" || model == "gpt4-plugins") {
    let modelName = "gpt-3.5-turbo";
    if (model == "gpt4-plugins") {
      modelName = "gpt-4";
    }
    let pluginsUrls = pluginList.map((x) => plugins[x]);
    let tools: any[] = [new RequestsGetTool(), new RequestsPostTool()];
    for (let i = 0; i < pluginsUrls.length; i++) {
      tools.push(await AIPluginTool.fromPluginUrl(pluginsUrls[i]));
    }
    const agent = await initializeAgentExecutorWithOptions(
      tools,
      new ChatOpenAI({
        modelName: modelName,
        openAIApiKey: process.env.OPENAI_API_KEY,
      }),
      { agentType: "chat-zero-shot-react-description", verbose: true }
    );
    // remove last message
    let lastMessage = messages.pop();

    let input = `Current conversation: ${messages
      .map((x) => `${x.role}: ${x.content}`)
      .join(`\n`)}\nuser: ${lastMessage.content}\nassistant:`;
    console.log(input);
    const result = await agent.call({
      input: input,
    });
    console.log(result);
    let response = result.output;
    return response;
  }
}
