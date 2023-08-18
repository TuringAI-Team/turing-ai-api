import axios from "axios";
export async function translateModels(model) {
  let models = {
    blip2: "v2/22whrikqknoc11",
    musicgen: "v2/zeeocl74aergso",
    llama2: "v2/39i5i1rtqkm7vk",
  };
  if (!models[model]) {
    throw new Error("Model not found");
  }

  return models[model];
}

export async function request(url, action, body) {
  let URL = `https://api.runpod.ai/${url}/${action}`;
  try {
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
    let result = res.data;
    return result;
  } catch (error: any) {
    console.log(error.response.data);
    throw error;
  }
}
