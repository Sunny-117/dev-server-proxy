import { Config } from "./types";
import { watchConfig } from "./core/watchConfig";
import { watchMockFiles } from "./core/watchMockFiles";
import { getServerType } from "./utils";

export function startWatch(config: Config, serverType?: string): void {
  const type = serverType || getServerType(config);

  if (!config[type]) {
    throw new Error(`type '${type}' is not configured. Please check your proxy config.`);
  }

  watchConfig.start(config, { PROXY: type });
  watchMockFiles.start(config.MOCK_PATH);
}
