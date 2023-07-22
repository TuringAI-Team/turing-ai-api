import axios from "axios";
import FormData from "form-data";
import { EventEmitter } from "events";

export default {
  data: {
    name: "stt",
    fullName: "Speech to text",
    parameters: {
      model: {
        type: "string",
        required: false,
        options: ["whisper", "fast-whisper", "gladia"],
        default: "fast-whisper",
        description: "Model to use for speech to text",
      },
      audio: {
        type: "string",
        required: true,
        description: "Audio URL to transcribe",
      },
      diarization: {
        type: "boolean",
        required: false,
        default: false,
        description: "Whether to use diarization or not",
      },
      type: {
        type: "string",
        required: false,
        options: ["tiny", "base", "small", "medium", "large-v1", "large-v2"],
        default: "base",
      },
      stream: {
        type: "boolean",
        required: false,
        default: false,
      },
    },
  },
  execute: async (data) => {
    let { model, audio, diarization, type } = data;
    const event = new EventEmitter();
    let result = {
      cost: 0,
      result: "",
      done: false,
    };
    event.emit("data", result);
    if (model == "gladia") {
      const form = new FormData();
      form.append("audio_url", audio);
      form.append("language_behaviour", "automatic single language");
      if (!diarization) diarization = false;
      form.append("toggle_diarization", diarization);

      result.cost = 0.01;
      axios
        .post("https://api.gladia.io/audio/text/audio-transcription/", form, {
          params: {
            model: "large-v2",
          },
          headers: {
            ...form.getHeaders(),
            accept: "application/json",
            "x-gladia-key": process.env.GLADIA_API_KEY,
            "Content-Type": "multipart/form-data",
          },
        })
        .then((response) => {
          var res = response.data;
          result.result = res;
          result.done = true;
          event.emit("data", result);
        });

      return event;
    }
    if (model == "whisper-fast" || model == "whisper") {
      let models = ["tiny", "base", "small", "medium", "large-v1", "large-v2"];
      let modelName = models.includes(type) ? type : "base";
      axios({
        url: `https://api.runpod.ai/v2/${
          model == "whisper-fast" ? "faster-" : ""
        }whisper/runsync`,
        method: "post",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${process.env.RUNPOD_API_KEY}`,
          accept: "application/json",
        },
        data: {
          input: {
            audio: audio,
            model: modelName,
            transcription: "plain text",
            translate: false,
            temperature: 0,
            best_of: 5,
            beam_size: 5,
            suppress_tokens: "-1",
            condition_on_previous_text: false,
            temperature_increment_on_fallback: 0.2,
            compression_ratio_threshold: 2.4,
            logprob_threshold: -1,
            no_speech_threshold: 0.6,
          },
        },
      }).then((response) => {
        let data = response.data;
        let price = 0.00025;
        result.cost = (data.executionTime / 1000) * price;
        result.result = data.output;
        event.emit("data", result);
      });
      return event;
    }
  },
};
