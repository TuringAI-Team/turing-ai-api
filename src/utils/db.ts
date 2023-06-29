import { pub } from "../db/mq.js";

export async function update(action: "update" | "vote", data: any) {
  let d = {};
  if (action === "update") {
    let collection = data.collection;
    let id = data.id;
    delete data.collection;
    delete data.id;
    d = {
      collection,
      id,
      updates: data,
    };
  } else {
    d = data.userId;
  }
  try {
    await pub.send(
      {
        exchange: "messages",
        routingKey: "message",
      },
      JSON.stringify({
        id: action,
        data: d,
      })
    );
  } catch (e) {
    console.log(e);
    return { error: e };
  }
}
