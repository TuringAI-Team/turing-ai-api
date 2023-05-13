import express from "express";
import { Request, Response } from "express";
import turnstile from "../middlewares/captchas/turnstile.js";
import key from "../middlewares/key.js";
const router = express.Router();
import ChartJsImage from "chartjs-to-image";
import ms from "ms";
import supabase from "../modules/supabase.js";

router.post("/:chart", key, turnstile, async (req: Request, res: Response) => {
  let { chart } = req.params;
  let { filter, period = "1d", type = "line" } = req.body;
  let availableCharts = [
    "chat",
    "guilds",
    "cooldown",
    "commands",
    "image",
    "vote",
    "campaigns",
  ];
  if (!availableCharts.includes(chart)) {
    return res.status(400).json({
      error: true,
      message: "Invalid chart type",
    });
  }
  let chartImage = new ChartJsImage();
  let { data } = await supabase.from("metrics").select("*").eq("type", chart);
  data = data.filter((d: any) => {
    let date = new Date(d.time);
    let now = new Date();
    let diff = now.getTime() - date.getTime();
    let periodMs = ms(period);
    return diff <= periodMs;
  });
  let metricData = data.map((d: any) => d.data);
  let labels = [];
  labels = data.map((d: any) => {
    let date = new Date(d.time);
    // format into dd/mm/yyyy hh:mm
    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();
    let hours = date.getHours();
    let minutes = date.getMinutes();
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  });
  let data1 = metricData[0];
  let keys = Object.keys(data1);
  let newKeys = [];
  let keysToRemove = [];
  for (let i = 0; i < keys.length; i++) {
    if (typeof data1[keys[i]] == "object") {
      // get all the keys of the object
      let subKeys = Object.keys(data1[keys[i]]);
      for (let j = 0; j < subKeys.length; j++) {
        // check subkeys for objects
        if (typeof data1[keys[i]][subKeys[j]] == "object") {
          let subSubKeys = Object.keys(data1[keys[i]][subKeys[j]]);
          // change subkeys to be parentKey-subKey-subSubKey
          subSubKeys = subSubKeys.map(
            (subSubKey) => `${keys[i]}.${subKeys[j]}.${subSubKey}`
          );
          // remove the parent key
          keysToRemove.push(`${keys[i]}.${subKeys[j]}`);
          // add the subkeys
          newKeys.push(...subSubKeys);
        }
      }
      // change subkeys to be parentKey-subKey
      subKeys = subKeys.map((subKey) => `${keys[i]}.${subKey}`);
      // remove the parent key
      keysToRemove.push(keys[i]);
      // add the subkeys
      newKeys.push(...subKeys);
    }
  }
  keys = keys.filter((key) => !keysToRemove.includes(key));
  keys.push(...newKeys);

  if (filter) {
    // filter is a object with include and exclude arrays
    if (filter.include) {
      keys = keys.filter((key) => filter.include.includes(key));
    }
    if (filter.exclude) {
      keys = keys.filter((key) => !filter.exclude.includes(key));
      // filter parent keys
      keys = keys.filter((key) => {
        if (key.includes(".")) {
          let parentKey = key.split(".")[0];
          return !filter.exclude.includes(parentKey);
        }
        return true;
      });
    }
  }
  let datasets = [];
  keys.forEach((key) => {
    let dataset;
    dataset = {
      label: key,
      data: [],
      fill: false,
    };
    if (key.includes(".")) {
      let parentKey = key.split(".")[0];
      let subKey = key.split(".")[1];

      data.forEach((d: any) => {
        dataset.data.push(d.data[parentKey][subKey]);
      });
    } else {
      data.forEach((d: any) => {
        dataset.data.push(d.data[key]);
      });
    }

    datasets.push(dataset);
  });
  chartImage.setConfig({
    type: type,
    data: {
      labels: labels,
      datasets: datasets,
    },
  });

  let image = await chartImage.toDataUrl();
  res.json({
    image: image,
    url: await chartImage.getShortUrl(),
  });
});

export default router;
