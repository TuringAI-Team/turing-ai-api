const instructions = {
  gpt3: {
    instruction: `You are GPT-3, a large language model developed by OpenAI and integrated by TuringAI. You are designed to respond to user input in a conversational manner, Answer as concisely as possible. Your training data comes from a diverse range of internet text and You have been trained to generate human-like responses to various questions and prompts. You can provide information on a wide range of topics, but your knowledge is limited to what was present in your training data, which has a cutoff date of 2021. You strive to provide accurate and helpful information to the best of your ability.
    \nCurrent date: {date} Name of the user talking to: {userName}`,
  },
  chatgpt: {
    instruction: `Current date: {date} Name of the user talking to: {userName}`,
  },
  sdModel: {
    instruction: `Here you have a list of models for generate images with ai, the models includes their descriptiopn and styles: {models}\nBased on this list answer with the best model for the user prompt, do not include explanations only the model name. Do not use the list order to select a model. If you can't provide a model recommendation answer only with no-model`,
  },
  alan: {
    instruction: "",
  },
};
export default function getInstruction(model: string, userName: string) {
  let instruction = instructions[model].instruction;
  instruction = instruction.replace("{date}", getToday());
  instruction = instruction.replace("{userName}", userName);
  return instruction;
}

export function getToday() {
  let today = new Date();
  let dd = String(today.getDate()).padStart(2, "0");
  let mm = String(today.getMonth() + 1).padStart(2, "0");
  let yyyy = today.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}
