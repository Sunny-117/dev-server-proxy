import * as fs from "fs";
import { Config, PathMapResult } from "./types";

export function getServerType(config: Config): string {
  let type = "";
  const proxy = process.env.PROXY;

  if (proxy) {
    type = proxy.toUpperCase();
  } else {
    const index = process.argv.indexOf("--proxy");
    if (index < 0 || index === process.argv.length - 1) {
      type = "MOCK";
    } else {
      type = process.argv[index + 1].toUpperCase();
    }
  }

  type = `PROXY_${type}`;

  if (config[type]) {
    return type;
  }

  return "PROXY_MOCK";
}

export function getPathMap(dir: string): PathMapResult {
  const pathMap: Record<string, string> = {};
  const pathErrors: Record<string, Record<string, boolean>> = {};

  const readDir = (f: string): void => {
    const files = fs.readdirSync(f);

    files.forEach((d) => {
      const p = `${f}/${d}`;

      if (fs.lstatSync(p).isDirectory()) {
        return readDir(p);
      }

      const file = p.split(/[/\\]/).pop();
      if (!file || file.indexOf("_") < 0) {
        return;
      }

      const path = file.replace(".js", "").replace(/_/g, "/");

      if (pathMap[path]) {
        pathErrors[path] = {
          ...pathErrors[path],
          [pathMap[path]]: true,
          [p]: true,
        };
      }

      pathMap[path] = p;
    });
  };

  readDir(dir);
  return { pathMap, pathErrors };
}

export function writeServerConfig(file: string, param: any): void {
  let data: any = null;

  try {
    data = JSON.parse(fs.readFileSync(file).toString());
  } catch {
    data = {};
  }

  Object.assign(data, param);
  fs.writeFileSync(file, JSON.stringify(data, null, 4));
}
