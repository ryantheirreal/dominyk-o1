import type { Config } from "../config.ts";
import { HttpComputerGateway, type ComputerGateway } from "./computer-gateway.ts";
import { HetznerComputerProvider } from "./hetzner-computer-provider.ts";
import type { ComputerProvider } from "./computer-provider.ts";

export interface O1ComputerFabric {
  provider?: ComputerProvider;
  gateway?: ComputerGateway;
  kind: "local" | "hetzner" | "unconfigured";
}

export function createComputerFabric(config: Config): O1ComputerFabric {
  const gateway = config.computerGatewayUrl && config.computerGatewayToken
    ? new HttpComputerGateway(config.computerGatewayUrl, config.computerGatewayToken)
    : undefined;
  if (config.hetznerApiToken) {
    return {
      kind: "hetzner",
      provider: new HetznerComputerProvider(config.hetznerApiToken, {
        image: config.hetznerImage ?? "ubuntu-24.04",
        serverType: config.hetznerServerType ?? "cpx22",
        location: config.hetznerLocation,
      }),
      gateway,
    };
  }
  return { kind: gateway ? "local" : "unconfigured", gateway };
}