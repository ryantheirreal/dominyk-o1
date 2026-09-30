import type { Config } from "../config.ts";
import { HttpComputerGateway, type ComputerGateway } from "./computer-gateway.ts";
import { BrowserWorkerGateway } from "./browser-worker-gateway.ts";
import { HetznerComputerProvider } from "./hetzner-computer-provider.ts";
import type { ComputerProvider } from "./computer-provider.ts";

export interface O1ComputerFabric {
  persistentProvider?: ComputerProvider;
  persistentGateway?: ComputerGateway;
  browserGateway?: ComputerGateway;
  kind: "local" | "hetzner" | "unconfigured";
}

export function createComputerFabric(config: Config): O1ComputerFabric {
  const persistentGateway = config.computerGatewayUrl && config.computerGatewayToken
    ? new HttpComputerGateway(config.computerGatewayUrl, config.computerGatewayToken)
    : undefined;
  const browserGateway = config.workerUrl && config.workerToken
    ? new BrowserWorkerGateway(config.workerUrl, config.workerToken)
    : undefined;
  if (config.hetznerApiToken) {
    return {
      kind: "hetzner",
      persistentProvider: new HetznerComputerProvider(config.hetznerApiToken, {
        image: config.hetznerImage ?? "ubuntu-24.04",
        serverType: config.hetznerServerType ?? "cpx22",
        location: config.hetznerLocation,
      }),
      persistentGateway,
      browserGateway,
    };
  }
  return { kind: browserGateway ? "local" : "unconfigured", browserGateway, persistentGateway };
}