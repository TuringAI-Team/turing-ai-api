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

export async function queue(prompt, mode, model = "5.1", premium = false) {
  let event = new EventEmitter();
  let id = randomUUID();
  let job = {
    id: id,
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
  await checkQueue(job, event, premium);
  let interval = setInterval(async () => {
    await checkQueue(job, event, premium);
  }, 5000);

  event.on("data", (data) => {
    if (!data.queued) {
      clearInterval(interval);
    }
    if (data.done) {
      clearInterval(interval);
      queued = generationQueue.findIndex((x) => x.id == job.id);
      generationQueue.splice(queued, 1);
    }
  });
  return event;
}

async function checkQueue(job, event, premium) {
  let queued = generationQueue.findIndex((x) => x.id == job.id);
  if (queued == -1) {
    event.emit("data", {
      queued: queued,
      done: true,
      prompt: job.prompt,
    });
    return;
  }
  if (generationQueue[queued].generating) {
    return;
  }
  let generating = generationQueue.filter((x) => x.generating == true).length;
  if ((generating <= 10 && queued <= 10) || (premium && generating <= 12)) {
    generationQueue[queued].generating = true;
    await imagine(
      generationQueue[queued].prompt,
      generationQueue[queued].mode,
      generationQueue[queued].model,
      event
    );
  } else {
    event.emit("data", {
      queued: queued,
      done: false,
    });
  }
}

export async function imagine(prompt, mode, model, event) {
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
      data.startTime = Date.now();
      data.messageId = message.id;
      data.id = `${message.id}-${channelName}`;
      data.status = 0;
      event.emit("data", data);
      botClient.on("messageUpdate", async (oldMessage, newMessage) => {
        if (oldMessage.id != message.id) return;
        let content = newMessage.content;
        let attachments = message.attachments;
        // get url
        let image = attachments.first()?.url;
        let status = 0;
        if (content) {
          status =
            parseInt(content?.split("(")[1]?.split("%)")[0]?.replace("%", "")) /
            100;
        } else {
          data.queued = 10;
        }
        data.image = image;
        if (
          (content.includes("(fast)") && !content.includes("%")) ||
          (content.includes("(relaxed)") && !content.includes("%"))
        ) {
          data.status = 1;
          data.done = true;
        } else if (
          content.includes("(Waiting to start)") &&
          !content.includes("%")
        ) {
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
          data.credits = credits;
          data.queued = null;
          redisClient.set(data.id, JSON.stringify(data));
          botClient.off("messageUpdate", () => {});
        }
        event.emit("data", data);
      });
      botClient.off("messageCreate", () => {});
    }
    let interval = setInterval(() => {
      if (!data.done) {
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

export async function actions() {}

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
