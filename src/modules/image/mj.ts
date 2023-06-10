import client from "../../selfbot.js";
import {
  CategoryChannel,
  Client,
  MessageButton,
  MessageSelectMenu,
  TextChannel,
} from "discord.js-selfbot-v13";
import EventEmitter from "events";
import redisClient from "../cache/redis.js";
import { randomUUID } from "crypto";
const botClient: Client = client;
botClient.setMaxListeners(0);
let generationQueue = [];
const maxGenerations = -1;
const mode = "relax";

export async function asyncQueue(prompt, model = "5.1", premium = false) {
  let event = await queue(prompt, model, premium, "imagine");
  return new Promise((resolve, reject) => {
    event.on("data", (data) => {
      if (data.done) {
        resolve(data);
      }
    });
  });
}

export async function queue(
  prompt,
  model = "5.1",
  premium = false,
  action = "imagine",
  number = 1,
  realId?: string
) {
  let event = new EventEmitter();
  let id = randomUUID();
  let job = {
    id: id,
    realId: realId,
    number: number,
    prompt: prompt,
    mode: mode,
    model: model,
    premium: premium,
    generating: false,
    channel: null,
  };
  generationQueue.push(job);
  let queued = generationQueue.length;
  event.emit("data", {
    queued: queued,
    done: false,
    prompt: prompt,
  });
  await checkQueue(job, event, premium, action);
  let interval = setInterval(async () => {
    await checkQueue(job, event, premium, action);
  }, 5000);
  event.on("close", () => {
    console.log("closed");
    queued = generationQueue.findIndex((x) => x.id == job.id);
    let job = generationQueue[queued];
    if (!job.generating) {
      clearInterval(interval);
      generationQueue.splice(queued, 1);
    }
  });
  event.on("data", (data) => {
    if (!data.queued && job.generating) {
      clearInterval(interval);
    }
    if (data.done) {
      clearInterval(interval);
      queued = generationQueue.findIndex((x) => x.id == job.id);
      // remove job from queue
      generationQueue.splice(queued, 1);
      console.log(generationQueue.length);
    }
  });
  return event;
}

async function checkQueue(job, event, premium, action) {
  let queued = generationQueue.findIndex((x) => x.id == job.id);
  if (!generationQueue[queued]) return;
  if (generationQueue[queued].generating) {
    return;
  }
  let generating = generationQueue.filter((x) => x.generating == true).length;
  if (
    (generating <= maxGenerations && queued <= maxGenerations) ||
    (premium && generating <= maxGenerations)
  ) {
    console.log("generating");
    generationQueue[queued].generating = true;
    if (action == "imagine") {
      await imagine(
        generationQueue[queued].prompt,
        generationQueue[queued].model,
        event,
        job
      );
    }
    if (action == "variation") {
      await actions(
        generationQueue[queued].realId,
        "variation",
        generationQueue[queued].number,
        event
      );
    }
  } else {
    event.emit("data", {
      queued: queued,
      done: false,
    });
  }
}

export async function imagine(prompt, model, event, job) {
  let guild = botClient.guilds.cache.get("1111700862868406383");
  if (!guild) return;
  let channelName = getChannel();
  if (!channelName) {
    event.emit("data", {
      error: "No channels available",
      done: true,
      prompt: prompt,
    });
    return;
  }
  let channel = guild.channels.cache.find(
    (x) => x.name == channelName
  ) as TextChannel;

  let data = {
    prompt: prompt,
    image: null,
    status: null,
    done: false,
    credits: 0,
    id: "",
    messageId: null,
    startTime: null,
    model: model,
    error: null,
    queued: null,
  };

  const mjBot = botClient.users.cache.get("936929561302675456");
  await channel.sendSlash(mjBot, "imagine", `${prompt} ${parseModel(model)}`);
  event.on("close", async () => {
    console.log("closed");
    botClient.off("messageCreate", () => {});
    botClient.off("messageUpdate", () => {});
    let message = await channel.messages.fetch(data.messageId);
    console.log(message.content);
    await message.contextMenu("936929561302675456", "Cancel Job");
  });
  botClient.on("messageCreate", async (message) => {
    let content1 = message.content;
    let channel: any = message.channel;
    let activated = false;
    let footer = message.embeds[0]?.footer?.text;

    // prompt can have image urls they can be from a lot of domains and paths
    let promptWithOutURL = prompt.replace(/(https?:\/\/[^\s]+)/g, "");
    if (footer && footer.includes(promptWithOutURL)) {
      let title = message.embeds[0]?.title;
      if (title && title.includes("Action needed to continue")) {
        data.error = "Flagged";
        data.done = true;
        data.queued = null;
        event.emit("data", data);
        botClient.off("messageCreate", () => {});
      }
      if (title && title.includes("Queue full")) {
        data.error = "Queue is full";
        data.done = true;
        data.queued = null;
        event.emit("data", data);
        botClient.off("messageCreate", () => {});
      }
      if (title && title.includes("Job queued")) {
        activated = true;
      }
      if (title && title.includes("Invalid parameter")) {
        data.error = "Invalid parameter";
        data.done = true;
        data.queued = null;
        event.emit("data", data);
        botClient.off("messageCreate", () => {});
      }
    }
    if (
      message.content.includes(promptWithOutURL) &&
      channel.name == channelName
    ) {
      activated = true;
    }
    if (activated) {
      if (!data.startTime) data.startTime = Date.now();
      data.messageId = message.id;
      data.id = `${message.id}-${channelName}`;
      data.status = 0;
      data = await checkContent(message, data);
      event.emit("data", data);
      if (data.done) return;
      botClient.on("messageUpdate", async (oldMessage, newMessage) => {
        if (oldMessage.id != message.id) return;
        data = await checkContent(newMessage, data);
        event.emit("data", data);
      });
      botClient.off("messageCreate", () => {});
    }
    let interval = setInterval(() => {
      let queued = generationQueue.findIndex((x) => x.id == job.id);
      if (!generationQueue[queued]) {
        clearInterval(interval);
        return;
      }
      job = generationQueue[queued];
      if (!data.done && !data.image && !data.status && queued != -1) {
        console.log("timeout");
        let timeInS = (Date.now() - data.startTime) / 1000;
        let timeToOut = 60 * 2;
        if (mode == "relax") timeToOut = 60 * 10;
        if (timeInS > timeToOut) {
          data.error = "Took too long to generate image";
          data.done = true;
          data.queued = null;
          clearInterval(interval);
          event.emit("data", data);
        }
      } else {
        clearInterval(interval);
      }
    }, 1000 * 60 * 5);
  });
}
export async function checkContent(newMessage, data) {
  let content = newMessage.content;
  let attachments = newMessage.attachments;
  // get url
  let image = attachments.first()?.url;
  let status = 0;
  if (content) {
    status =
      parseInt(content?.split("(")[1]?.split("%)")[0]?.replace("%", "")) / 100;
    data.queued = null;
  } else {
    let generating = generationQueue.filter((x) => x.generating == true).length;
    data.queued = generating - 1;
    data.done = false;
  }
  data.image = image;
  if (
    (content.includes("(fast)") && !content.includes("%") && image) ||
    (content.includes("(relaxed)") && !content.includes("%") && image) ||
    (content.includes(`Image #${data.number + 1}`) && image) ||
    (content.includes("Variations by") && !content.includes("%") && image)
  ) {
    data.status = 1;
    data.done = true;
  } else if (content.includes("(Waiting to start)") && !content.includes("%")) {
    data.status = 0;
    data.done = false;
  } else {
    if (!data.startTime) {
      data.startTime = Date.now();
    }
    data.status = status;
  }

  if (data.done) {
    let timeInS = (Date.now() - data.startTime) / 1000;
    //  each second is 0.001 credits
    let pricePerSecond = 0.001;
    if (mode == "relax") pricePerSecond = 0;
    let credits = timeInS * pricePerSecond;

    if (mode == "relax") credits = 0;
    data.credits = credits;
    data.queued = null;
    if (data.fullId) {
      redisClient.set(
        data.fullId ? data.fullId : data.id,
        JSON.stringify(data)
      );
    }
    botClient.off("messageUpdate", () => {});
  }
  return data;
}

export async function actions(id, action, number, event?) {
  if (!event) event = new EventEmitter();
  let messageId = id.split("-")[0];
  let channelName = parseInt(id.split("-")[1]);
  let fullId = `${id}-${action}-${number}`;
  let job = await redisClient.get(fullId);
  if (job) {
    event.emit("data", {
      ...JSON.parse(job),
    });
    return event;
  }
  try {
    let guild = botClient.guilds.cache.get("1111700862868406383");
    if (!guild) return;
    if (!channelName) {
      event.emit("data", {
        error: "No channels available",
        done: true,
        prompt: prompt,
      });
      return event;
    }
    let channel = guild.channels.cache.find(
      (x) => x.name == channelName.toString()
    ) as TextChannel;
    let message = await channel.messages.fetch(messageId);
    let actionRow: any = message.components[action == "upscale" ? 0 : 1];
    if (!actionRow) {
      event.emit("data", {
        error: "No action row available",
        done: true,
      });
      return event;
    }
    let button = actionRow.components[number];
    // use application command
    let r = await button.click(message);
    let data = {
      prompt: message.content
        .split(" - ")[0]
        .split(message.content.includes("niji") ? "--niji" : "--v")[0]
        .replaceAll("**", "")
        .trim(),
      action: action,
      model: `mj-${
        message.content.includes("niji") ? "niji" : ""
      }-${message.content
        .split(" - ")[0]
        .split(message.content.includes("niji") ? "--niji" : "--v")[1]
        .replaceAll("**", "")
        .replaceAll(" ", "")}`,
      image: null,
      status: null,
      done: false,
      number: number,
      credits: 0,
      startTime: null,
      jobId: randomUUID(),
      error: null,
      fullId: fullId,
      queued: null,
      messageId: null,
      id: null,
    };
    botClient.on("messageCreate", async (message) => {
      let channel: any = message.channel;
      let activated = false;
      let footer = message.embeds[0]?.footer?.text;
      // prompt can have image urls they can be from a lot of domains and paths
      let promptWithOutURL = data.prompt.replace(/(https?:\/\/[^\s]+)/g, "");
      if (footer && footer.includes(promptWithOutURL)) {
        let title = message.embeds[0]?.title;
        if (title && title.includes("Action needed to continue")) {
          data.error = "Flagged";
          data.done = true;
          event.emit("data", data);
          botClient.off("messageCreate", () => {});
        }
        if (title && title.includes("Job queued")) {
          activated = true;
        }
      }
      if (
        message.content.includes(promptWithOutURL) &&
        channel.name == channelName
      ) {
        activated = true;
      }
      if (activated) {
        console.log("activated");
        data.messageId = message.id;
        data.id = `${message.id}-${channelName}`;
        data.startTime = Date.now();
        data.status = 0;
        data = await checkContent(message, data);
        event.emit("data", data);
        if (data.done) return;
        botClient.on("messageUpdate", async (oldMessage, newMessage) => {
          if (oldMessage.id != message.id) return;
          data = await checkContent(newMessage, data);
          event.emit("data", data);
        });
        botClient.off("messageCreate", () => {});
      }
      let interval = setInterval(() => {
        if (!data.done) {
          let timeInS = (Date.now() - data.startTime) / 1000;
          let timeToOut = 60 * 10;
          if (timeInS > timeToOut) {
            data.error = "Took too long to generate image";
            data.done = true;
            clearInterval(interval);
            event.emit("data", data);
          }
        } else {
          clearInterval(interval);
        }
      }, 1000 * 60 * 5);
    });
    return event;
  } catch (e) {
    console.log(e);
    event.emit("data", {
      error: "Something went wrong",
      done: true,
    });
    return event;
  }
}

function getChannel() {
  let usedChannels = generationQueue.map((x) => x.channel);
  //  get a random channel from 1 to 14 that is not in usedChannels
  if (usedChannels.length == 14) {
    return null;
  }
  let channel = Math.floor(Math.random() * 14) + 1;
  while (usedChannels.includes(channel)) {
    channel = Math.floor(Math.random() * 14) + 1;
  }
  return channel.toString();
}
export function parseModel(model) {
  let prompt = "";
  if (model == "niji") {
    prompt = `--niji 5 `;
  } else {
    prompt = `--v ${model}`;
  }
  return prompt;
}
