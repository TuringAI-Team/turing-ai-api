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

let generating = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
let jobQueue = 0;
let jobQueue2 = 0;
let queue = [];
let describing = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const botClient: Client = client;

export async function imagineAsync(prompt: string, model = "5.1") {
  let event = await imagine(prompt, model);
  return new Promise((resolve, reject) => {
    event.on("data", (data) => {
      if (data.done) {
        resolve(data);
      }
    });
  });
}
let actualMode = "relax";

export async function imagineWithQueue(
  prompt: string,
  mode = "relax",
  model = "5.1"
) {
  let event = new EventEmitter();
  let job = {
    id: randomUUID(),
    prompt: prompt,
    mode: mode,
    model: model,
    generating: false,
  };
  let done = false;
  queue.push(job);
  let queuePos = queue.length;
  event.emit("data", {
    queued: queuePos,
    done: false,
    prompt: prompt,
  });
  let promptsGenerating = queue.filter((x) => x.generating);
  console.log(promptsGenerating.length, queue.length);
  // check queue, if it is the first one, start it with imagine
  await checkQueuePostion(queuePos, job, prompt, mode, model, event);
  let interval = setInterval(async () => {
    await checkQueuePostion(queuePos, job, prompt, mode, model, event);
  }, 10000);
  event.on("data", (data) => {
    if (!data.queued) {
      clearInterval(interval);
    }
    if (data.done) {
      clearInterval(interval);
      done = true;
      queuePos = queue.findIndex((x) => x.id == job.id);
      queue.splice(queuePos, 1);
    }
  });
  return event;
}
async function checkQueuePostion(queuePos, job, prompt, mode, model, event) {
  queuePos = queue.findIndex((x) => x.id == job.id);
  job = queue[queuePos];
  if (queuePos <= 10 && !job.generating && jobQueue <= 10) {
    event.emit("data", {
      prompt: prompt,
      image: null,
      status: null,
      done: false,
      credits: 0,
      action: null,
      id: "",
      messageId: null,
      startTime: null,
      model: model,
      error: null,
    });
    // change generating to true so it doesn't get called again
    job.generating = true;
    // update queue
    queue[queuePos] = job;

    let data = await imagine(prompt, mode, model);
    data.on("data", (data) => {
      event.emit("data", data);
    });
  } else {
    event.emit("data", {
      prompt: job.prompt,
      queued: queuePos,
      done: false,
    });
  }
  return {
    queuePos: queuePos,
    job: job,
    event,
  };
}

export async function imagine(prompt: string, mode = "relax", model = "5.1") {
  let event = new EventEmitter();
  let guild = botClient.guilds.cache.get("1111700862868406383");
  if (!guild) return;
  if (generating.length <= 0 || jobQueue >= 10) {
    event.emit("data", {
      error: "Too many images generating",
      done: true,
    });
    return event;
  }
  let genAt = generating.pop();
  // get channel by name
  let channel = guild.channels.cache.find(
    (x) => x.name == genAt.toString()
  ) as TextChannel;
  if (!channel.isText()) return;
  // use application command
  const user = botClient.users.cache.get("936929561302675456");
  let data = {
    prompt: prompt,
    image: null,
    status: null,
    done: false,
    credits: 0,
    action: null,
    id: "",
    messageId: null,
    startTime: null,
    model: model,
    error: null,
  };

  switch (model) {
    case "5.1":
      prompt = `${prompt} --v 5.1`;
      break;

    case "5":
      prompt = `${prompt} --v 5`;
      break;
    case "niji":
      prompt = `${prompt} --niji 5 `;
      break;
    case "4":
      prompt = `${prompt} --v 4`;
      break;
    case "3":
      prompt = `${prompt} --v 3`;
      break;
    case "2":
      prompt = `${prompt} --v 2`;
      break;
    case "1":
      prompt = `${prompt} --v 1`;
      break;
  }
  jobQueue++;
  /*
  if (mode == "relax") {
    if (actualMode != "relax") {
      // await channel.sendSlash(user, "relax");
      actualMode = "relax";
    }
  } else {
    if (actualMode != "fast") {
      //await channel.sendSlash(user, "fast");
      actualMode = "fast";
    }
  }*/
  let reply = await channel.sendSlash(user, "imagine", prompt);
  // get last message from bot in channel
  let startTime = Date.now();
  let interval = setInterval(() => {
    checkStatus(channel, user, data, prompt).then((x) => {
      data = x;
      data.id = `${data.messageId}-${genAt}`;
      let timeInS = (Date.now() - startTime) / 1000;
      let timeToOut = 60 * 2;
      if (mode == "relax") timeToOut = 60 * 5;
      if (timeInS > timeToOut) {
        jobQueue--;
        data.error = "Took too long to generate image";
        data.done = true;
        clearInterval(interval);
      }
      if (data.done) {
        jobQueue--;
        if (data.startTime) startTime = data.startTime;
        let timeInS = (Date.now() - startTime) / 1000;
        //  each second is 0.001 credits
        let pricePerSecond = 0.001;
        if (mode == "relax") pricePerSecond = 0;
        let credits = timeInS * pricePerSecond;
        data.credits = credits;
        generating.push(genAt);
        redisClient.set(data.id, JSON.stringify(data));
        event.emit("data", data);
        clearInterval(interval);
      } else {
        event.emit("data", data);
      }
    });
  }, 1000 * 3);

  return event;
  //await command.sendSlashCommand();
}

export async function describe(image: string) {
  let event = new EventEmitter();
  let guild = botClient.guilds.cache.get("1111700862868406383");
  if (!guild) return;
  let desAt = describing.pop();
  // get channel by name
  let channel = guild.channels.cache.find(
    (x) => x.name == `d-${desAt.toString()}`
  ) as TextChannel;
  if (!channel.isText()) return;
  // use application command
  const user = botClient.users.cache.get("936929561302675456");
  let reply = await channel.sendSlash(user, "describe", image);
  // get last message from bot in channel
  let data = {
    image: image,
    descriptions: [],
    status: null,
    done: false,
  };
  checkStatusDescribe(channel, user, data).then((x) => {
    data = x;
    event.emit("data", data);
  });
  let interval = setInterval(() => {
    checkStatusDescribe(channel, user, data).then((x) => {
      data = x;
      event.emit("data", data);
      if (data.done) {
        describing.push(desAt);
        clearInterval(interval);
      }
    });
  }, 1000 * 5);

  return event;
  //await command.sendSlashCommand();
}
async function checkStatus(channel, user, data, prompt) {
  let x = await channel.messages.fetch();
  let messages = x.filter((x) => {
    return x.content.includes(prompt);
  });
  if (data.action) {
    if (data.action == "upscale") {
      messages = messages.filter(
        (x) =>
          x.content.includes("Upscaling") ||
          x.content.includes(`Image #${data.number + 1}`)
      );
    } else {
      messages = messages.filter(
        (x) =>
          x.content.includes("Making variations") ||
          x.content.includes("Variations")
      );
    }
  }
  messages = messages.first();
  if (!messages) {
    let checkFlagged = await redisClient.get(`imagine:${prompt}`);
    if (checkFlagged) {
      data.status = 1;
      data.done = true;
      if (checkFlagged == "Action needed to continue") {
        data.error = "Flagged";
      } else if (checkFlagged == "Invalid parameter") {
        data.error = "Invalid parameter";
      } else {
        data.error = "Too many images generating";
      }
      data.id = null;
      data.credits = 0;
      return data;
    }
    data.error = "No message found";
    data.done = true;
    if (!messages) return data;
  }
  if (messages.author.id != user.id) return data;
  data.messageId = `${messages.id}`;
  // get message content
  let content = messages.content;
  // get attachments
  let attachments = messages.attachments;
  // get url
  let url = attachments.first()?.url;
  let status;
  if (!data.action || data.action != "upscale") {
    status = content.split("(")[1].split("%)")[0];
  }
  data.image = url;
  if (
    (content.includes("(fast)") && !content.includes("%")) ||
    (content.includes("(relaxed)") && !content.includes("%")) ||
    (content.includes(`Image #${data.number + 1}`) && url) ||
    (content.includes("Variations by") && !content.includes("%"))
  ) {
    data.status = 1;
    data.done = true;
  } else if (content.includes("(Waiting to start)") && !content.includes("%")) {
    data.status = 0;
  } else {
    if (!data.startTime) {
      data.startTime = Date.now();
    }
    status = status.replace("%", "");
    data.status = parseInt(status) / 100;
  }
  return data;
}

async function checkStatusDescribe(channel, user, data) {
  let x = await channel.messages.fetch();
  let messages = x.filter((x) => x.author.id == user.id).first();
  if (!messages) return;
  // message is embed
  if (!messages.embeds[0]) return data;
  let embed = messages.embeds[0];
  // get description
  let description = embed.description;
  // description is split by \n
  let descriptions = description.split("\n");
  // remove  emote  that are the emote of 1 to 4

  descriptions = descriptions.map((x) => {
    let d = x.split("--ar")[0];
    // remove emotes that are number emotes from 1 to 4
    d = d
      .replace("1️⃣", "")
      .replace("2️⃣", "")
      .replace("3️⃣", "")
      .replace("4️⃣", "");

    // sometime it includes [text] (url) replace that with just the text
    d = d.replace(/\[.*\]\(.*\)/g, (x) => {
      return x.split("[")[1].split("]")[0];
    });
    d = d.strip();
    if (d == "") return null;
    return d;
  });
  data.descriptions = descriptions;
  data.done = true;

  return data;
}

export async function buttons(id, action, number = 1, mode = "relax") {
  let messageId = id.split("-")[0];
  let channelid = parseInt(id.split("-")[1]);
  let jobId = `${id}-${action}-${number}`;
  let event = new EventEmitter();
  let job = await redisClient.get(jobId);
  if (job) {
    event.emit("data", {
      ...JSON.parse(job),
    });
    return event;
  }
  let guild = botClient.guilds.cache.get("1111700862868406383");
  if (jobQueue2 >= 10 && action != "upscale") {
    event.emit("data", {
      error: "Too many images generating",
      done: true,
    });
    return event;
  }
  jobQueue2++;
  if (!guild) return;
  let channel = guild.channels.cache.find(
    (x) => x.name == channelid.toString()
  ) as TextChannel;
  // remove channelid from generating array
  if (!channel.isText()) return;
  let message = await channel.messages.fetch(messageId);
  let actionRows = message.components;
  let variationRow: any = actionRows[action == "upscale" ? 0 : 1];
  let button = variationRow.components[number];
  // use application command
  const user = botClient.users.cache.get("936929561302675456");
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
    id: "",
    messageId: "",
    startTime: null,
    jobId: randomUUID(),
    error: null,
  };
  await channel.send({
    content: `Variations by ${message.content
      .split(" - ")[0]
      .replaceAll("**", "")} Image #${data.number + 1}`,
  });
  if (mode == "relax") {
    //await channel.sendSlash(user, "relax");
  } else {
    //await channel.sendSlash(user, "fast");
  }
  // get last message from bot in channel
  botClient.on("messageCreate", async (message) => {
    let content1 = message.content;
    let expectedContent = `Making variations for image #${
      data.number + 1
    } with prompt`;
    if (
      (content1.includes(data.prompt) && content1.includes("Variations by")) ||
      (content1.includes(data.prompt) &&
        content1.includes(`Image #${data.number + 1}`))
    ) {
      let attachments = message.attachments;
      // get url
      let url = attachments.first()?.url;
      let status;
      if (!data.action || data.action != "upscale") {
        status = content1.split("(")[1].split("%)")[0];
      }
      data.image = url;
      data.status = 1;
      data.done = true;

      jobQueue2--;
      if (data.startTime) startTime = data.startTime;
      let timeInS = (Date.now() - startTime) / 1000;
      //  each second is 0.001 credits
      let pricePerSecond = 0.001;
      if (mode == "relax") pricePerSecond = 0;
      let credits = timeInS * pricePerSecond;
      data.credits = credits;
      generating.push(channelid);
      redisClient.set(jobId, JSON.stringify(data));
      event.emit("data", data);
    }
    if (
      (content1.includes(expectedContent) && content1.includes(data.prompt)) ||
      (content1.includes("Upscaling image") && content1.includes(data.prompt))
    ) {
      let messageId = message.id;
      botClient.on("messageUpdate", async (oldMessage, newMessage) => {
        if (newMessage.id == messageId) {
          let content = newMessage.content;
          // get attachments
          let attachments = newMessage.attachments;
          // get url
          let url = attachments.first()?.url;
          let status;
          if (!data.action || data.action != "upscale") {
            status = content.split("(")[1].split("%)")[0];
          }
          data.image = url;
          if (
            (content.includes("(fast)") && !content.includes("%")) ||
            (content.includes("(relaxed)") && !content.includes("%")) ||
            (content.includes(`Image #${data.number + 1}`) && url) ||
            (content.includes("Variations by") && !content.includes("%"))
          ) {
            data.status = 1;
            data.done = true;
          } else if (
            content.includes("(Waiting to start)") &&
            !content.includes("%")
          ) {
            data.status = 0;
          } else {
            if (!data.startTime) {
              data.startTime = Date.now();
            }
            status = status.replace("%", "");
            data.status = parseInt(status) / 100;
          }
          data.id = `${data.messageId}-${channelid}`;
          let timeInS = (Date.now() - startTime) / 1000;
          let timeToOut = 60 * 2;
          if (mode == "relax") timeToOut = 60 * 5;
          if (timeInS > timeToOut) {
            jobQueue2--;
            data.error = "Took too long to generate image";
            data.done = true;
            clearInterval(interval);
          }
          if (data.done) {
            jobQueue2--;
            if (data.startTime) startTime = data.startTime;
            let timeInS = (Date.now() - startTime) / 1000;
            //  each second is 0.001 credits
            let pricePerSecond = 0.001;
            if (mode == "relax") pricePerSecond = 0;
            let credits = timeInS * pricePerSecond;
            data.credits = credits;
            generating.push(channelid);
            redisClient.set(jobId, JSON.stringify(data));
            event.emit("data", data);
          } else {
            event.emit("data", data);
          }
        }
      });
    }
  });
  let r = await button.click(message);
  let startTime = Date.now();
  return event;
  let interval = setInterval(() => {
    checkStatus(channel, user, data, message.content.split(" - ")[0]).then(
      (x) => {
        data = x;
        data.id = `${data.messageId}-${channelid}`;
        let timeInS = (Date.now() - startTime) / 1000;
        let timeToOut = 60 * 2;
        if (mode == "relax") timeToOut = 60 * 5;
        if (timeInS > timeToOut) {
          jobQueue2--;
          data.error = "Took too long to generate image";
          data.done = true;
          clearInterval(interval);
        }
        if (data.done) {
          jobQueue2--;
          if (data.startTime) startTime = data.startTime;
          let timeInS = (Date.now() - startTime) / 1000;
          //  each second is 0.001 credits
          let pricePerSecond = 0.001;
          if (mode == "relax") pricePerSecond = 0;
          let credits = timeInS * pricePerSecond;
          data.credits = credits;
          generating.push(channelid);
          redisClient.set(jobId, JSON.stringify(data));
          event.emit("data", data);
          clearInterval(interval);
        } else {
          event.emit("data", data);
        }
      }
    );
  }, 1000 * 5);

  return event;
}
