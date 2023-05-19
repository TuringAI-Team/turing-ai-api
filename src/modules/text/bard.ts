import supabase from "../supabase.js";
import { Bard } from "googlebard";

export async function getAcc() {
  let { data: accs } = await supabase.from("g_accs").select("*");
  // filter accs with less than 3 messages
  accs = accs.filter((x) => x.messages < 3);
  // sort by messages
  accs.sort((a, b) => a.messages - b.messages);
  // sort by total messages
  accs.sort((a, b) => a.totalMessages - b.totalMessages);
  // get the first one
  // get one of the first 3
  accs = accs.slice(0, 3);
  let acc = accs[Math.floor(Math.random() * accs.length)];
  return acc;
}
export async function resetBard(conversationId) {
  conversationId = `bard-${conversationId}`;
  let acc = await getAcc();
  if (!acc) return { error: "max-accs-reached" };
  await addMsg(acc);
  let cookies = `__Secure-1PSID=${acc.token}`;
  try {
    let bot = new Bard(cookies, {
      inMemory: false, // optional: if true, it will not save conversations to disk
      savePath: "./temp/conversations.json", // optional: path to save conversations
      proxy: {
        // optional: proxy configuration
        host: process.env.PROXY_HOST,
        port: 80,
        auth: {
          username: process.env.PROXY_USERNAME,
          password: process.env.PROXY_PASSWORD,
        },
        protocol: "http",
      },
    });
    await bot.resetConversation(conversationId);
    let { data: conversation } = await supabase
      .from("conversations_new")
      .select("*")
      .eq("id", conversationId)
      .single();
    if (!conversation) return { error: "no-conversation" };
    await supabase.from("conversations_new").update({
      history: {
        messages: [
          ...(conversation.history?.messages || []),
          {
            action: "reset",
            role: "user",
          },
        ],
      },
    });
    await removeMsg(acc);
  } catch (error) {
    console.log(error);
    await removeMsg(acc);
  }
}
export default async function bard(message, conversationId) {
  conversationId = `bard-${conversationId}`;
  let acc = await getAcc();
  if (!acc) return { error: "max-accs-reached" };
  await addMsg(acc);
  let cookies = `__Secure-1PSID=${acc.token}`;
  console.log(acc.id);
  try {
    let bot = new Bard(cookies, {
      inMemory: false, // optional: if true, it will not save conversations to disk
      savePath: "./temp/conversations.json", // optional: path to save conversations
      proxy: {
        // optional: proxy configuration
        host: process.env.PROXY_HOST,
        port: 80,
        auth: {
          username: process.env.PROXY_USERNAME,
          password: process.env.PROXY_PASSWORD,
        },
        protocol: "http",
      },
    });
    let { data: conversation }: any = await supabase
      .from("conversations_new")
      .select("*")
      .eq("id", conversationId);
    var response;
    conversation = conversation[0];
    response = await bot.ask(message, conversationId); // conversationId is optional
    let newConversations = await bot.getAllConversations();
    // get the actual conversation
    let actualConversation = newConversations.find(
      (x) => x.id == conversationId
    );
    if (conversation) {
      await supabase.from("conversations_new").update({
        history: {
          data: {
            ...actualConversation,
          },
          messages: [
            ...conversation.history.messages,
            {
              message: message,
              role: "user",
            },
            {
              role: "assistant",
              message: response,
            },
          ],
        },
      });
    } else {
      await supabase.from("conversations_new").insert({
        history: {
          data: {
            ...actualConversation,
          },
          messages: [
            {
              message: message,
              role: "user",
            },
            {
              role: "assistant",
              message: response,
            },
          ],
        },
        id: conversationId,
        tone: null,
        model: "bard",
      });
    }
    setTimeout(async () => {
      await removeMsg(acc);
    }, 5000);
    return { response };
  } catch (e) {
    setTimeout(async () => {
      await removeMsg(acc);
    }, 5000);

    return { error: "max-accs-reached" };
  }
}

async function addMsg(acc) {
  await supabase
    .from("g_accs")
    .update({
      messages: acc.messages + 1,
      totalMessages: acc.totalMessages + 1,
    })
    .eq("id", acc.id);
}
async function removeMsg(acc) {
  let newMsgs = acc.messages - 1;
  if (newMsgs < 0) newMsgs = 0;
  await supabase.from("g_accs").update({ messages: newMsgs }).eq("id", acc.id);
}
