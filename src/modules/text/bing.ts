import { BingAIClient } from "@waylaidwanderer/chatgpt-api";
import supabase from "../supabase.js";

export default async function Bing(
  prompt: string,
  conversationId: string,
  tone: string
) {
  try {
    conversationId = `bing-${conversationId}`;
    let bingAIClient = new BingAIClient({
      // "_U" cookie from bing.com
      userToken: "",
      // A proxy string like "http://<ip>:<port>"
      proxy: `http://${process.env.PROXY_HOST}:9999`,
      // (Optional) Set to true to enable `console.debug()` logging
      debug: true,
    });
    console.log(conversationId);
    let conversation = await getConversation(conversationId);
    let response = await bingAIClient.sendMessage(prompt, {
      onProgress: (token) => {
        console.log(token);
        process.stdout.write(token);
      },
    });
    console.log(response);
    await setConversation(conversationId, response);
    return response;
  } catch (error) {
    console.log(error);
    return { error: "error" };
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
