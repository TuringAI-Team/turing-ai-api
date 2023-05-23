import EventEmitter from "events";
export default function Gen2(prompt: string) {
  let emitter = new EventEmitter();
  return emitter;
}
