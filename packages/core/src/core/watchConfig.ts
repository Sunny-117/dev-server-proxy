import * as fs from "fs";
import * as path from "path";
import chalk = require("chalk");
import { Config, RunningConfig } from "../types";
import { writeServerConfig } from "../utils";

let started = false;
let innerConfig: RunningConfig = {} as RunningConfig;

export const watchConfig = {
  start: (config: Config, params: any): void => {
    if (started) {
      return;
    }
    started = true;

    const configFile = path.join(config.WORK_PATH, "./.devserverrc");
    innerConfig = { ...config, ...params };
    writeServerConfig(configFile, innerConfig);

    console.log((chalk as any).bgYellow(`Start watch config file ${configFile}`));

    fs.watch(config.WORK_PATH, (event, filename) => {
      if (filename !== ".devserverrc") {
        return;
      }

      try {
        innerConfig = JSON.parse(fs.readFileSync(configFile).toString());
        console.log((chalk as any).green(`Running config has been reload from ${configFile}`));
      } catch (e) {
        console.error((chalk as any).red(e));
      }
    });
  },

  get: (): RunningConfig => innerConfig,
};
