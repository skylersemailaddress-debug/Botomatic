export type CapabilityManifest = {
  id: string;
  name: string;
  version: string;
  permissions: string[];
  supportedDomains: string[];
  requiredValidators: string[];
  installPath: string;
  updatePath: string;
  removePath: string;
  rollbackPath: string;
};
