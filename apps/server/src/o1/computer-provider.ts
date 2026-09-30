export type ComputerKind = "persistent" | "browser" | "sandbox";

export interface ComputerHandle {
  id: string;
  kind: ComputerKind;
  status: string;
  endpoint?: string;
}

export interface ComputerProvider {
  readonly kind: ComputerKind;
  create(input: { owner: string; name: string; image?: string; region?: string; size?: string }): Promise<ComputerHandle>;
  get(id: string): Promise<ComputerHandle>;
  start(id: string): Promise<void>;
  stop(id: string): Promise<void>;
  destroy(id: string): Promise<void>;
}