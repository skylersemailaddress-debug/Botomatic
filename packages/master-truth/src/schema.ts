export type MasterTruthV2 = {
  version: "v2";
  productIntent: string;
  users: string[];
  roles: string[];
  entities: string[];
  workflows: string[];
  integrations: string[];
  constraints: string[];
  assumptions: string[];
  confidence: number;
};

export function validateMasterTruth(input: any): MasterTruthV2 {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid master truth input");
  }

  return {
    version: "v2",
    productIntent: String(input.productIntent || ""),
    users: input.users || [],
    roles: input.roles || [],
    entities: input.entities || [],
    workflows: input.workflows || [],
    integrations: input.integrations || [],
    constraints: input.constraints || [],
    assumptions: input.assumptions || [],
    confidence: typeof input.confidence === "number" ? input.confidence : 0.5,
  };
}
