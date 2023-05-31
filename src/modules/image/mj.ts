import client from "../../selfbot.js";
import {
  CategoryChannel,
  Client,
  MessageButton,
  MessageSelectMenu,
  TextChannel,
} from "discord.js-selfbot-v13";
import EventEmitter from "events";
import redisClient from "../cache/redis.js";
import { randomUUID } from "crypto";
const botClient: Client = client;
botClient.setMaxListeners(0);

export async function queue() {}

export async function imagine() {}

export async function actions() {}

export async function checkContent() {}
