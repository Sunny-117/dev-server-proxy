import * as url from "url";
import chalk = require("chalk");
import { Request, Response, NextFunction } from "express";
import { Config, ParsedUrl, Middleware } from "../types";
import { watchConfig } from "./watchConfig";
import { mockMiddleware } from "../middlewares/mock";
import { logMiddleware } from "../middlewares/log";
import { proxyMiddleware } from "../middlewares/proxy";

function isLogRequest(config: Config, parsedUrl: ParsedUrl): boolean {
  const { LOG_API } = config;
  return !!(LOG_API && typeof LOG_API.test === "function" && LOG_API.test(parsedUrl.pathname));
}

function getPath(config: Config, parsedUrl: ParsedUrl): string {
  const { CUSTOM_API, AJAX_API } = config;
  let path = "";

  if (CUSTOM_API instanceof Array && CUSTOM_API.length) {
    for (let i = 0; i < CUSTOM_API.length; i++) {
      const api = CUSTOM_API[i];
      if (!api || typeof api.rule !== "function") {
        continue;
      }

      const customPath = api.rule(parsedUrl);
      if (typeof customPath !== "string" || !customPath.length) {
        continue;
      }

      path = customPath;
      break;
    }
  }

  if (
    !path &&
    AJAX_API &&
    typeof AJAX_API.test === "function" &&
    AJAX_API.test(parsedUrl.pathname) &&
    parsedUrl.query &&
    parsedUrl.query.path
  ) {
    path = parsedUrl.query.path;
  }

  return path;
}

function getProxyTarget(runingConfig: any, path: string): string {
  const { PROXY, PATH_RULES } = runingConfig;
  const getTarget = (obj: any): string =>
    typeof obj.target === "string" && obj.target.length ? obj.target : "";

  let target = "";
  let proxy = "";

  if (PATH_RULES && PATH_RULES[path]) {
    proxy = PATH_RULES[path].proxy;
    target = getTarget(PATH_RULES[path]);
  }

  if (!target && !proxy && PROXY && runingConfig[PROXY]) {
    target = getTarget(runingConfig[PROXY]);
  }

  return target;
}

export function getProxyMiddleware(config: Config): Middleware {
  return (request: Request, response: Response, next: NextFunction): void => {
    const runingConfig = watchConfig.get();
    const parsedUrl = url.parse(request.url, true) as ParsedUrl;

    if (isLogRequest(config, parsedUrl) && request.method === "POST") {
      logMiddleware(request, response);
      return;
    }

    const path = getPath(config, parsedUrl);
    if (!path) {
      next();
      return;
    }

    const target = getProxyTarget(runingConfig, path);
    if (target) {
      const data: string[] = [];
      request.on("data", (trunk: Buffer) => data.push(trunk && trunk.toString()));
      request.on("end", (trunk?: Buffer) => {
        if (trunk) {
          data.push(trunk.toString());
        }
        (request as any).body = data.join("");
        proxyMiddleware(request as any, response, path, target);
      });
      return;
    }

    console.log((chalk as any).bgGreen(`[PROXY TO MOCK] PATH: ${path}`));
    mockMiddleware(path)(request, response);
  };
}
