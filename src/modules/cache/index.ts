import redisClient from "./redis.js";
async function checkInCache(message, model) {
  /*  let wordCount = message.split(" ").length;
  if (wordCount <= 1) {
    return {};
  }*/
  let responses = await redisClient.get(message);
  if (responses) {
    responses = JSON.parse(responses);
    if (responses[model]) {
      return responses[model];
    } else {
      return {};
    }
  }
  return {};
}
async function saveInCache(message: string, response, model) {
  try {
    let responses: any = await redisClient.get(message);
    if (responses) {
      responses = JSON.parse(responses);
      await redisClient.set(
        message,
        JSON.stringify({
          ...responses,
          [model]: {
            response: response,
            uses: 0,
          },
        })
      );
    } else {
      await redisClient.set(
        message,
        JSON.stringify({
          [model]: {
            response: response,
            uses: 0,
          },
        })
      );
    }
  } catch (e) {}
}
async function addUsesInCache(message, model) {
  let responses: any = await redisClient.get(model);
  if (responses) {
    responses = JSON.parse(responses);
    if (responses[message]) {
      responses[message].uses += 1;
    }
  }
  await redisClient.set(model, JSON.stringify(responses));
}

export { checkInCache, saveInCache, addUsesInCache };
