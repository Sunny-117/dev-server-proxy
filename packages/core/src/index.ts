import { Config, DevServerConfig, MiddlewaresHandler } from "./types";
import { getProxyMiddleware } from "./core/server";
import { startWatch } from "./startWatch";
import { getServerType } from "./utils";

export function webpackDevServerProxy(
  config: Config,
  webpackVersion?: number,
  middlewaresHandler?: MiddlewaresHandler,
): DevServerConfig {
  const type = getServerType(config);
  startWatch(config, type);

  const allowedHosts: Record<string, boolean> = {};
  Object.keys(config).forEach((key) => {
    if (config[key].host) {
      allowedHosts[config[key].host] = true;
    }
  });

  const open = config[type].open;
  const proxyConfig: DevServerConfig = {
    https: type === "PROXY_ONLINE",
    open: Array.isArray(open) ? open : [open],
    allowedHosts: Object.keys(allowedHosts),
  };

  if (webpackVersion == null || webpackVersion < 5) {
    return {
      ...proxyConfig,
      openPage: open,
      before(app: any) {
        app.use(getProxyMiddleware(config));
      },
    };
  }

  return {
    ...proxyConfig,
    setupMiddlewares: (middlewares: any[], devServer: any) => {
      middlewares.unshift({
        name: "proxy mock",
        middleware: getProxyMiddleware(config),
      });

      if (typeof middlewaresHandler === "function") {
        middlewaresHandler(middlewares, devServer);
      }

      return middlewares;
    },
  };
}

export { startWatch as startMockWatch } from "./startWatch";
export { getProxyMiddleware } from "./core/server";
export * from "./types";
