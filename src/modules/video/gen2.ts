import client from "../../selfbot.js";
import supabase from "../supabase.js";
var videosGenerating = 0;

export default async function Gen2(prompt: string) {
  // just 8 generations per minute
  if (videosGenerating >= 3) {
    return { error: "Too many videos generating, try again later" };
  }
  let channel: any = client.channels.cache.get("1098719904556929064");
  if (!channel) {
    return { error: "Channel not found" };
  }
  await channel.send(`<@1093334543265693786> ${prompt}`);
  videosGenerating++;
  let collector = channel.createMessageCollector({
    filter: (m: any) => m.author.id == "1093334543265693786",
    time: 1000 * 60 * 5,
  });
  let requestId;
  let start = Date.now();
  collector.on("collect", (m: any) => {
    let content = m.content;
    if (content.includes(`${prompt}`)) {
      requestId = content.split("request id ")[1].split(")")[0];
      console.log(requestId);
    }
    console.log(m.content);
    if (m.content.includes("Generated video")) {
      // get attachment
      let attachment = m.attachments.first();
      if (!attachment) return;
      let url = attachment.url;
      console.log(url);

      collector.stop();
      let timeInSecs = (Date.now() - start) / 1000;
      setTimeout(() => {
        videosGenerating--;
      }, (60 - timeInSecs) * 1000);
      return { url, requestId };
    }
  });
}
