import type { CapabilityDefinitionV1 } from "@lasoviet/contracts";

const capabilities: readonly CapabilityDefinitionV1[] = [{
  version: 1,
  id: "ziwei.identity.p0",
  systemId: "ziwei",
  technicalAvailable: true,
  publicAvailable: true,
  paidAvailable: true,
  skuId: "ZIWEI-IDENTITY-P0",
}];

export function getCapability(
  id: CapabilityDefinitionV1["id"],
): CapabilityDefinitionV1 | undefined {
  return capabilities.find((capability) => capability.id === id);
}

export function listCapabilities(): readonly CapabilityDefinitionV1[] {
  return capabilities;
}
