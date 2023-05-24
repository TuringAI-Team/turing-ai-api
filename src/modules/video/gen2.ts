import EventEmitter from "events";
import client from "../../selfbot.js";
import supabase from "../supabase.js";
var videosGenerating = 0;
import filter from "../filter/index.js";

export default async function Gen2(
  prompt: string,
  interpolate = false,
  upscale = false
) {
  let emitter = new EventEmitter();
  try {
    // just 8 generations per minute
    if (videosGenerating >= 4) {
      emitter.emit("data", {
        error: "Too many videos generating, try again later",
        end: true,
      });
      return emitter;
    }
    let channel: any = client.channels.cache.get("1098719904556929064");
    if (!channel) {
      emitter.emit("data", { error: "channel not found", end: true });
      return emitter;
    }
    await channel.send(
      `<@1093334543265693786> ${prompt} ${interpolate ? "--interpolate" : ""} ${
        upscale ? "--upscale" : ""
      }`
    );
    videosGenerating++;
    let collector = channel.createMessageCollector({
      filter: (m: any) => m.author.id == "1093334543265693786",
      time: 1000 * 60 * 5,
    });
    let requestId;
    let start = Date.now();
    emitter.emit("data", { generationg: true, end: false, requestId });
    collector.on("collect", (m: any) => {
      let content = m.content;
      console.log(content);
      if (content.includes(`${prompt}`)) {
        requestId = content.split("request id ")[1].split(")")[0];
        console.log(requestId);
        emitter.emit("data", { generationg: true, end: false, requestId });
      }
      if (m.content.includes("Generated video")) {
        // get attachment
        let attachment = m.attachments.first();
        if (!attachment) {
          emitter.emit("data", { error: "video not found", end: true });
        }
        let url = attachment.url;
        console.log(url);
        emitter.emit("data", { url, end: true, requestId, generating: false });

        collector.stop();
        let timeInSecs = (Date.now() - start) / 1000;
        setTimeout(() => {
          videosGenerating--;
        }, (60 - timeInSecs) * 1000);
      }
    });
    return emitter;
  } catch (error) {
    emitter.emit("data", { error: error });
    return emitter;
  }
}
