import { Request, Response } from "express";
import { parse } from "querystring";
import chalk = require("chalk");
import { MockFunction } from "../types";
import { watchMockFiles } from "../core/watchMockFiles";

export function mockMiddleware(path: string, data: string[] = []) {
  return (request: Request, response: Response): void => {
    if (`${request.header("accept")}`.endsWith("json")) {
      response.header("content-type", "application/json;charset=UTF-8");
    }

    const gotRequestData = (): void => {
      const { pathErrors, pathMap } = watchMockFiles.get();
      const file = pathMap[path];

      if (!file) {
        response.status(404);
        response.send(`Mock file has not been found.（${path}）`);
        return;
      }

      if (pathErrors[path]) {
        console.log(
          (chalk as any).bgRed(
            [
              "Warning:",
              `    ${path} has multiple mock files:`,
              `       ${Object.keys(pathErrors[path]).join("\n       ")}`,
              "    Currently in force:",
              `        ${file}`,
            ].join("\n"),
          ),
        );
      }

      try {
        const func: MockFunction = require(file);

        if (!func || typeof func !== "function") {
          response.status(404);
          response.send(`Mock file is not a function.（${path}）`);
          return;
        }

        let param: any = "";
        try {
          const parsed = parse(decodeURIComponent(data.join("")));
          param = JSON.parse(parsed.params as string);
        } catch {
          param = data.join("");
        }

        const result = func(param);
        // @ts-ignore
        const { status, response: resp } = result;
        response.status(status);
        response.send(JSON.stringify(resp));
      } catch (e: any) {
        response.status(500);
        response.send(e.toString());
      }
    };

    if (data.length) {
      gotRequestData();
    } else {
      request.on("data", (trunk: Buffer) => data.push(trunk ? trunk.toString() : ""));
      request.on("end", (trunk?: Buffer) => {
        data.push(trunk ? trunk.toString() : "");
        gotRequestData();
      });
    }
  };
}
