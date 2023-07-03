import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import log from "./log.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docsPagesPath = path.join(__dirname, "../../docs/");
const docsPath = path.join(__dirname, "../../docs.json");

export async function autogenerateDocs(client) {
  let docsConfig = JSON.parse(fs.readFileSync(docsPath, "utf8"));
  let sections = [];
  let newConfig = {};
  sections = Object.keys(client).filter((section) => {
    return client[section].length > 0;
  });
  let sidebar = [];
  sidebar = sections.map((section) => {
    return [
      `${section.charAt(0).toUpperCase() + section.slice(1)} Models`,
      [
        ...client[section].map((model) => {
          return [model.data.fullName, `/${section}/${model.data.name}`];
        }),
      ],
    ];
  });
  delete docsConfig.sidebar;
  newConfig = {
    ...docsConfig,
    sidebar,
  };
  fs.writeFileSync(docsPath, JSON.stringify(newConfig, null, 2));
  log("info", `Sidebar docs generated.`);
  for (let section of sections) {
    let folderExists = fs.existsSync(path.join(docsPagesPath, section));
    if (!folderExists) {
      fs.mkdirSync(path.join(docsPagesPath, section));
    }
    for (let model of client[section]) {
      let docsModelPath = path.join(
        docsPagesPath,
        section,
        `${model.data.name}/index.mdx`
      );
      let docsModelContent = `---\ntitle: ${model.data.fullName}\n---\n\n# ${model.data.fullName}\n\n## Parameters\n\n`;
      for (let parameter of Object.keys(model.data.parameters)) {
        docsModelContent += `\n- **${parameter}**\n  - Type: ${model.data.parameters[parameter].type}\n  - Required: ${model.data.parameters[parameter].required}\n`;
        if (model.data.parameters[parameter].options) {
          docsModelContent += `  - Options: ${model.data.parameters[
            parameter
          ].options.join(", ")}\n`;
        }
        if (model.data.parameters[parameter].default) {
          docsModelContent += `  - Default: ${model.data.parameters[parameter].default}\n`;
        }
      }
      docsModelContent += `\n## Examples\n\n`;
      docsModelContent += generateExamples(model, section);
      if (!fs.existsSync(path.join(docsPagesPath, section, model.data.name))) {
        fs.mkdirSync(path.join(docsPagesPath, section, model.data.name));
      }
      fs.writeFileSync(docsModelPath, docsModelContent);
    }
  }
  log("info", `Docs generated.`);
}

function generateExamples(model, section) {
  let data = {};
  for (let parameter of Object.keys(model.data.parameters)) {
    if (model.data.parameters[parameter].default) {
      data[parameter] = model.data.parameters[parameter].default;
    } else if (model.data.parameters[parameter].options) {
      data[parameter] = model.data.parameters[parameter].options[0];
    } else if (model.data.parameters[parameter].required == true) {
      data[parameter] = model.data.parameters[parameter].type;
    }
  }

  let example = `<CodeGroup title="${model.data.fullName} example">
  \`\`\`typescript
  import axios from "axios";
  (async () => {
    let response = await axios({
      method: "post",
      url: 'https://api.turing.sh/${section}/${model.data.name}',
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer YOUR_API_KEY",
      },
      data: ${JSON.stringify(data, null, 2)},
    })
  })();
  \`\`\`
  \`\`\`python
  import requests
  import json
  response = requests.post(
    "https://api.turing.sh/${section}/${model.data.name}",
    headers={
      "Content-Type": "application/json",
      "Authorization": "Bearer YOUR_API_KEY",
    },
    data=json.dumps(${JSON.stringify(data, null, 2)}),
  )
  \`\`\`
</CodeGroup>`;
  return example;
}
