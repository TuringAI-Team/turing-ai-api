import axios from "axios";
// use voice as language for google tts
export default async function TTS(
  ai: "elevenlabs" | "google",
  voice: string,
  msg: string
) {
  if (ai == "elevenlabs") {
    return await elevenLabs(voice, msg);
  }
}

async function elevenLabs(voice: string, msg: string) {
  let res = await axios({
    url: `https://api.pawan.krd/tts`,
    method: "GET",
    params: {
      text: encodeURIComponent(msg),
      voice: voice,
    },
  });
  let buffer = Buffer.from(res.data, "base64");
  return buffer;
}
