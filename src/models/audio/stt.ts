import axios from "axios";
import FormData from "form-data";

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
    },
  },
  execute: async (data) => {
    let { model, audio, diarization, type } = data;
    if (model == "gladia") {
      const form = new FormData();
      form.append("audio_url", audio);
      form.append("language_behaviour", "automatic single language");
      if (!diarization) diarization = false;
      form.append("toggle_diarization", diarization);

      const response = await axios.post(
        "https://api.gladia.io/audio/text/audio-transcription/",
        form,
        {
          params: {
            model: "large-v2",
          },
          headers: {
            ...form.getHeaders(),
            accept: "application/json",
            "x-gladia-key": process.env.GLADIA_API_KEY,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      var res = response.data;
      return res;
    }
    if (model == "whisper-fast") {
      let models = ["tiny", "base", "small", "medium", "large-v1", "large-v2"];
      let modelName = models.includes(type) ? type : "base";
      let response = await axios({
        url: "https://api.runpod.ai/v2/faster-whisper/runsync",
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
      });
      return response.data;
    }
    if (model == "whisper") {
      let models = ["tiny", "base", "small", "medium", "large-v1", "large-v2"];
      let modelName = models.includes(model) ? model : "base";
      let response = await axios({
        url: "https://api.runpod.ai/v2/whisper/runsync",
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
      });
      return response.data;
    }
  },
};
