import supabase from "../supabase.js";
import { Bard } from "googlebard";

export async function getAcc() {
  let { data: accs } = await supabase.from("g_accs").select("*");
  // filter accs with less than 3 messages
  accs = accs.filter((x) => x.messages < 3);
  // sort by messages
  accs.sort((a, b) => a.messages - b.messages);
  // get the first one
  let acc = accs[0];
  return acc;
}
export default async function bard(message, conversationId) {
  conversationId = `bard-${conversationId}`;
  let acc = await getAcc();
  if (!acc) return { error: "max-accs-reached" };
  await addMsg(acc);
  let cookies = `__Secure-1PSID=${acc.token}`;
  console.log(acc.id, cookies);
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

    await removeMsg(acc);

    return { response };
  } catch (e) {
    await removeMsg(acc);
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
  await supabase
    .from("g_accs")
    .update({ messages: acc.messages - 1 })
    .eq("id", acc.id);
}
