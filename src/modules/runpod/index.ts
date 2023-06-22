import axios from "axios";
export async function translateModels(model) {
  let models = {
    blip2: "v2/22whrikqknoc11",
    musicgen: "v2/j2exf53cbmqqsa",
  };
  return models[model];
}

export async function request(url, action, body) {
  let URL = `https://api.runpod.ai/${url}/${action}`;
  let res = await axios({
    method: "POST",
    url: URL,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RUNPOD_KEY}`,
    },
    data: {
      input: {
        ...body.input,
      },
    },
  });
  console.log(res.data);
  let result = res.data;
  return result;
}
