import * as fs from "fs";
import chalk = require("chalk");
import { PathMapResult } from "../types";
import { getPathMap } from "../utils";

let pathMap: Record<string, string> = {};
let pathErrors: Record<string, Record<string, boolean>> = {};
let started = false;

function update(obj: PathMapResult): void {
  pathMap = obj.pathMap;
  pathErrors = obj.pathErrors;
}

export const watchMockFiles = {
  start: (mockPath: string): void => {
    if (started) {
      return;
    }
    started = true;

    update(getPathMap(mockPath));
    console.log((chalk as any).bgYellow(`Start watching mock files: ${mockPath}`));

    let updateTimer: NodeJS.Timeout | null = null;
    const updateMap: Record<string, boolean> = {};

    fs.watch(mockPath, { recursive: true }, (evt, file) => {
      if (updateTimer) {
        clearTimeout(updateTimer);
      }

      updateMap[`${mockPath}/${file}`] = true;

      updateTimer = setTimeout(() => {
        update(getPathMap(mockPath));

        const files = Object.keys(updateMap);
        while (files.length) {
          const newFile = files.pop();
          if (!newFile) continue;

          delete updateMap[newFile];

          if (!/.js$/.test(newFile)) {
            continue;
          }

          try {
            delete require.cache[require.resolve(newFile)];
            require(newFile);
            console.log((chalk as any).bgYellow(`Reload mock file ${newFile}`));
          } catch {
            // do nothing
          }
        }
      }, 100);
    });
  },

  get: (): PathMapResult => ({ pathMap, pathErrors }),
};
