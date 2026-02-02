import { Request, Response, NextFunction } from "express";

export interface ProxyConfig {
  host: string;
  target?: string;
  open: string | string[];
}

export interface CustomApiRule {
  rule: (url: ParsedUrl) => string;
}

export interface PathRule {
  proxy?: string;
  target?: string;
}

export interface Config {
  WORK_PATH: string;
  MOCK_PATH: string;
  LOG_API?: RegExp;
  AJAX_API?: RegExp;
  CUSTOM_API?: CustomApiRule[];
  PATH_RULES?: Record<string, PathRule>;
  [key: string]: any;
}

export interface RunningConfig extends Config {
  PROXY?: string;
}

export interface ParsedUrl {
  pathname: string;
  query: Record<string, any>;
  path?: string;
  href?: string;
  search?: string;
  hash?: string;
}

export interface MockResponse {
  status: number;
  response: any;
}

export type MockFunction = (params: any) => MockResponse | Promise<MockResponse>;

export interface PathMapResult {
  pathMap: Record<string, string>;
  pathErrors: Record<string, Record<string, boolean>>;
}

export type Middleware = (request: Request, response: Response, next: NextFunction) => void;

export interface MiddlewaresHandler {
  (middlewares: any[], devServer: any): any[];
}

export interface DevServerConfig {
  https?: boolean;
  open?: string | string[];
  allowedHosts?: string[];
  openPage?: string | string[];
  before?: (app: any) => void;
  setupMiddlewares?: (middlewares: any[], devServer: any) => any[];
}
