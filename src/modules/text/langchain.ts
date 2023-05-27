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
    let event = new EventEmitter();
    let modelName = "gpt-3.5-turbo";
    if (model == "gpt4-plugins") {
      modelName = "gpt-4";
    }
    let pluginsUrls = pluginList.map((x) => plugins[x]);
    let tools: any[] = [new RequestsGetTool(), new RequestsPostTool()];
    for (let i = 0; i < pluginsUrls.length; i++) {
      tools.push(await AIPluginTool.fromPluginUrl(pluginsUrls[i]));
    }
    event.emit("data", {
      message: "Initializing agent...",
      done: false,
    });
    initializeAgentExecutorWithOptions(
      tools,
      new ChatOpenAI({
        modelName: modelName,
        openAIApiKey: process.env.OPENAI_API_KEY,
        temperature: 0.2,
      }),
      { agentType: "chat-zero-shot-react-description", verbose: false }
    ).then(async (agent) => {
      try {
        let lastMessage = messages.pop();
        let input =
          `${
            messages.length > 0
              ? `Current conversation: ${messages
                  .map((x) => `${x.role}: ${x.content}`)
                  .join(`\n`)}\n`
              : ""
          }user: ${lastMessage.content}\n` +
          ` 
          assistant:`;

        //  \n is not working
        console.log({ input });
        let response = {
          result: "",
          done: false,
          extra: {},
          tool: null,
          thought: null,
          credits: 0,
        };
        let pricePerK = 0.002;
        if (model == "gpt4-plugins") {
          pricePerK = 0.06;
        }
        let credits = 0;
        credits += ((await getChatMessageLength(messages)) / 1000) * pricePerK;
        credits += (getPromptLength(lastMessage.content) / 1000) * pricePerK;
        response.credits = credits;
        const result = await agent.run(input, [
          {
            handleAgentAction(action, runId) {
              credits += (getPromptLength(action.log) / 1000) * pricePerK;
              response.credits = credits;
              if (action.tool != "requests_get") {
                console.log("\nhandleAgentAction", action, runId);

                response.thought = action.log
                  .split(".\n")[0]
                  .replace("Thought: ", "");
                response.tool = action.tool;
                event.emit("data", response);
              }
            },
            handleToolEnd(output, runId) {
              if (
                !output.includes("401") &&
                !output.includes("Authorization") &&
                !output.includes("Usage Guide:")
              ) {
                console.log("\nhandleToolEnd", output, runId);
                response.extra = output;
                event.emit("data", response);
              }
            },
          },
        ]);
        credits += (getPromptLength(result) / 1000) * pricePerK;
        response.credits = credits;
        response.result = result;
        response.done = true;
        event.emit("data", response);
        console.log(result);
      } catch (e) {
        event.emit("data", { error: e, done: true });
      }
    });
    // remove last message

    return event;
  }
}

import { get_encoding } from "@dqbd/tiktoken";
export const encoder = get_encoding("cl100k_base");

/**
 * Get the length of a prompt.
 * @param content Prompt to check
 *
 * @returns Length of the prompt, in tokens
 */
export const getPromptLength = (content: string): number => {
  content = content
    .replaceAll("<|endoftext|>", "<|im_end|>")
    .replaceAll("<|endofprompt|>", "<|im_end|>");
  return encoder.encode(content).length;
};

export const getChatMessageLength = (messages: []): number => {
  /* Total tokens used for the messages */
  let total: number = 0;

  for (const message of messages) {
    /* Map each property of the message to the number of tokens it contains. */
    const propertyTokenCounts = Object.entries(message).map(
      ([_, value]: any) => {
        /* Count the number of tokens in the property value. */
        return getPromptLength(value);
      }
    );

    /* Sum the number of tokens in all properties and add 4 for metadata. */
    total += propertyTokenCounts.reduce((a, b) => a + b, 4);
  }

  return total + 2;
};
