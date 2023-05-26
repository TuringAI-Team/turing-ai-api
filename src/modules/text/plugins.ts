import axios from "axios";
import redisClient from "../cache/redis.js";

const plugins = {
  klarna: "https://www.klarna.com/.well-known/ai-plugin.json",
  "ascii-art":
    "https://chatgpt-plugin-ts.transitive-bullshit.workers.dev/.well-known/ai-plugin.json",
  urlReader: "https://www.greenyroad.com/.well-known/ai-plugin.json",
  tasty: "https://api.tasty.co/.well-known/ai-plugin.json",
  sceneXplain: "https://scenex.jina.ai/.well-known/ai-plugin.json",
  apisguru: "https://apis.guru/.well-known/ai-plugin.json",
  milo: "https://www.joinmilo.com/.well-known/ai-plugin.json",
  seogpt: "https://aii.seovendor.co/.well-known/ai-plugin.json",
  "wolfram-alpha": "https://www.wolframalpha.com/.well-known/ai-plugin.json",
  calculator:
    "https://chat-calculator-plugin.harishkgarg.repl.co/.well-known/ai-plugin.json",
  music: "https://www.mixerbox.com/.well-known/ai-plugin.json",
  medium: "https://medium.com/.well-known/ai-plugin.json",
  freetv: "https://www.freetv-app.com/.well-known/ai-plugin.json",
  noteable: "https://chat.notebookgpt.com/.well-known/ai-plugin.json",
  yabble: "https://yabblezone.net/.well-known/ai-plugin.json",
  kalendarai: "https://kalendar.ai/.well-known/ai-plugin.json",
  vidgpt: "https://woxo.tech/.well-known/ai-plugin.json",
  safari: "https://www.gps-telecom.com/.well-known/ai-plugin.json",
  transvribe: "https://www.transvribe.com/.well-known/ai-plugin.json",
  weather: "https://gptweather.skirano.repl.co/.well-known/ai-plugin.json",
  collov: "https://gpt.collov.com/.well-known/ai-plugin.json",
  linkReader: "https://gochitchat.ai/.well-known/ai-plugin.json", // pdf ppt word docs
  webPilot: "https://webreader.webpilotai.com/.well-known/ai-plugin.json",
  showMeDiagrams: "https://showme.redstarplugin.com/.well-known/ai-plugin.json",
  YayForms: "https://openai-plugin.yayforms.com/.well-known/ai-plugin.json",
  MagicSlides: "https://www.magicslides.app/.well-known/ai-plugin.json",
  cloudflare: "https://api.radar.cloudflare.com/.well-known/ai-plugin.json",
  scholar: "https://scholar-ai.net/.well-known/ai-plugin.json",
  edx: "https://chatgpt-plugin.2u.com/.well-known/ai-plugin.json",
  "dev-to": "https://dev.to/.well-known/ai-plugin.json",
  kraftful:
    "https://klever-chatgpt-plugin-prod.herokuapp.com/.well-known/ai-plugin.json",
  medqa: "https://labs.cactiml.com/.well-known/ai-plugin.json",
  chess: "https://gpt-chess.atomic14.com/.well-known/ai-plugin.json",
  comic: "https://comicfinder.fly.dev/.well-known/ai-plugin.json",
  etoro: "https://www.etoro.com/.well-known/ai-plugin.json",
  likewise: "https://likewiserecommends.com/.well-known/ai-plugin.json",
  infobot: "https://infobot.ai/.well-known/ai-plugin.json",
};
export async function getPlugins() {
  let resultPlugins: any[];
  try {
    for (let i = 0; i < Object.keys(plugins).length; i++) {
      let plugin = Object.keys(plugins)[i];
      let pluginUrl = plugins[plugin];
      let cache = await redisClient.get(`plugin-${plugin}`);
      if (cache) {
        resultPlugins.push(JSON.parse(cache));
      } else {
        let { data } = await axios.get(pluginUrl);
        let formatData = {
          name: data.name_for_human,
          description: data.description_for_human,
          logo_url: data.logo_url,
        };
        resultPlugins.push(formatData);
        await redisClient.set(`plugin-${plugin}`, JSON.stringify(formatData));
      }
    }
  } catch (error) {
    console.log(error);
  }

  return resultPlugins;
}

export default plugins;
