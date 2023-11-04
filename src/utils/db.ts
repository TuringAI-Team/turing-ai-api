import { pub } from "../db/mq.js";

export async function update(action: "update" | "vote", data: any) {
  let d = {};

  let collection;
  let id;
  if (action === "update") {
    collection = data.collection;
    id = data.id;
    delete data.collection;
    delete data.id;
    d = {
      collection,
      id,
      data: data,
    };
  } else {
    d = {
      userId: data.userId,
    };
  }
  try {
    await pub.send(
      {
        exchange: "db",
        routingKey: "db",
      },
      JSON.stringify({
        type: action,
        ...d,
      })
    );
  } catch (e) {
    console.log(e);
    return { error: e };
  }
}
