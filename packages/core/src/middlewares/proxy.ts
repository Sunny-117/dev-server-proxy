import { Request, Response } from "express";
import chalk from "chalk";
import request from "request";

export function proxyMiddleware(
  req: Request & { body?: string },
  res: Response,
  path: string,
  target: string,
): void {
  if (`${req.header("accept")}`.endsWith("json")) {
    res.header("content-type", "application/json;charset=UTF-8");
  }

  const url = `${target}${req.url}`;
  const oldHeaders = JSON.parse(JSON.stringify(req.headers));
  const headers = {
    "content-Type": "application/x-www-form-urlencoded",
    accept: "application/json, text/plain, */*",
    ...oldHeaders,
    origin: target,
    referer: target,
    "accept-encoding": "",
    host: target.replace(/https?:\/\//, ""),
  };

  const params = {
    url,
    headers,
    method: "POST",
    body: req.body || "",
  };

  request(params, (error, response, body) => {
    if (error) {
      console.log((chalk as any).bgRed(`[PROXY TO TARGET ERROR] TARGET: ${target}`));
      res.status(500);
      res.send(error);
      return;
    }

    console.log((chalk as any).bgGreen(`[PROXY TO TARGET] PATH: ${path} TARGET: ${target}`));
    res.status(200);
    res.send(body);
  });
}
