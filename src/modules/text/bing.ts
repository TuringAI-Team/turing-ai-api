import { BingAIClient } from "@waylaidwanderer/chatgpt-api";
import supabase from "../supabase.js";
import EventEmitter from "events";

export default async function Bing(
  prompt: string,
  conversationId: string,
  tone: string
) {
  let event = new EventEmitter();
  var data = {
    prompt: prompt,
    tone: tone,
    response: "",
    done: false,
    suggestedResponse: [],
    sourceAtrribution: [],
    adaptiveCard: [],
    error: null,
  };
  try {
    conversationId = `bing-${conversationId}`;
    let bingAIClient = new BingAIClient({
      // "_U" cookie from bing.com
      // A proxy string like "http://<ip>:<port>"
      proxy: `http://${process.env.PROXY_HOST}:9999`,
      // (Optional) Set to true to enable `console.debug()` logging
      debug: false,
    });
    console.log(conversationId);
    let previousMsg = "";
    let tokens = 0;
    let conversation = await getConversation(conversationId);
    let conversationData;
    if (conversation.conversationSignature) {
      conversationData = {
        conversationId: conversation.conversationId,
        conversationSignature: conversation.conversationSignature,
        clientId: conversation.clientId,
        invocationId: conversation.invocationId,
      };
    }
    bingAIClient
      .sendMessage(prompt, {
        ...conversationData,
        toneStyle: tone, // or creative, precise, fast
        onProgress: (token) => {
          previousMsg += token;
          tokens++;
          data.response = previousMsg;
          if (tokens > 15) {
            event.emit("data", data);
            tokens = 0;
          }
        },
      })
      .then(async (response) => {
        data.response = response.response;
        data.suggestedResponse = response.details.suggestedResponses;
        data.sourceAtrribution = response.details.sourceAttributions;
        data.adaptiveCard = response.details.adaptiveCards;
        data.done = true;
        event.emit("data", data);
        await setConversation(conversationId, response);
      });
    return event;
  } catch (error: any) {
    return { error };
  }
}

async function getConversation(conversationId: string) {
  let { data: conversations } = await supabase
    .from("conversations_new")
    .select("*")
    .eq("id", conversationId)
    .single();
  if (!conversations) return {};
  return conversations.history;
}

export async function resetConversation(conversationId: string) {
  await supabase.from("conversations_new").delete().eq("id", conversationId);
}

async function setConversation(conversationId: string, response) {
  let { data: conversations } = await supabase
    .from("conversations_new")
    .select("*")
    .eq("id", conversationId)
    .single();
  if (!conversations) {
    await supabase.from("conversations_new").insert({
      id: conversationId,
      history: {
        conversationSignature: response.conversationSignature,
        conversationId: response.conversationId,
        clientId: response.clientId,
        invocationId: response.invocationId,
      },
      model: "bing",
      tone: "bing",
    });
  } else {
    await supabase
      .from("conversations_new")
      .update({
        history: {
          conversationSignature: response.conversationSignature,
          conversationId: response.conversationId,
          clientId: response.clientId,

          invocationId: response.invocationId,
        },
      })
      .eq("id", conversationId);
  }
}
