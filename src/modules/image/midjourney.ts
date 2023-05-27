import client from "../../selfbot.js";
import { CategoryChannel, Client, TextChannel } from "discord.js-selfbot-v13";
import EventEmitter from "events";

let generating = 0;
let describing = 0;
const botClient: Client = client;

export async function imagine(prompt: string, model?: string) {
  let event = new EventEmitter();
  let guild = botClient.guilds.cache.get("1111700862868406383");
  if (!guild) return;
  generating++;
  // get channel by name
  let channel = guild.channels.cache.find(
    (x) => x.name == generating.toString()
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
  let startTime = Date.now();
  let reply = await channel.sendSlash(user, "imagine", prompt);
  // get last message from bot in channel

  checkStatus(channel, user, data).then((x) => {
    data = x;
    event.emit("data", data);
  });
  let interval = setInterval(() => {
    checkStatus(channel, user, data).then((x) => {
      data = x;
      event.emit("data", data);
      console.log(data);

      if (data.done) {
        let timeInS = (Date.now() - startTime) / 1000;
        //  each second is 0.001 credits
        let credits = timeInS * 0.001;
        data.credits = credits * 1.15;
        generating--;
        clearInterval(interval);
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
  describing++;
  // get channel by name
  let channel = guild.channels.cache.find(
    (x) => x.name == `d-${describing.toString()}`
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
        describing--;
        clearInterval(interval);
      }
    });
  }, 1000 * 5);

  return event;
  //await command.sendSlashCommand();
}
async function checkStatus(channel, user, data) {
  let x = await channel.messages.fetch();
  let messages = x.filter((x) => x.author.id == user.id).first();
  if (!messages) return;
  // get message content
  let content = messages.content;
  // get attachments
  let attachments = messages.attachments;
  // get url
  let url = attachments.first()?.url;
  let status = content.split("(")[1].split("%)")[0];
  data.image = url;
  console.log(status);
  if (status == "fast") {
    data.status = 1;
    data.done = true;
    generating--;
  } else if (status == "Waiting to start") {
    data.status = 0;
  } else {
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
