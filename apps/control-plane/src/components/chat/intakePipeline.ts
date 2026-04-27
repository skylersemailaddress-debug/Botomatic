export type IntakeSourceType =
  | "uploaded_file"
  | "uploaded_zip"
  | "uploaded_document"
  | "github_url"
  | "cloud_link"
  | "pasted_text"
  | "local_manifest_json"
  | "existing_project_reference";

export type IntakeContext = {
  source_input: {
    sourceType: IntakeSourceType;
    value: string;
  };
  intake_source: {
    provider: "local" | "github" | "cloud" | "text" | "manifest" | "existing";
    accepted: boolean;
  };
  source_manifest: {
    manifestType: string;
    summary: string;
  };
  extracted_context: {
    contextRef: string;
    extracted: boolean;
  };
  build_contract_context: {
    seededFromIntake: boolean;
    recommendedIntent: "generated_app_build" | "repo_rescue";
  };
  planning: {
    required: true;
  };
  execution: {
    required: true;
  };
};

export function normalizeIntakeContext(input: {
  sourceType: IntakeSourceType;
  value: string;
  suggestedIntent?: "generated_app_build" | "repo_rescue";
}): IntakeContext {
  const provider =
    input.sourceType === "github_url"
      ? "github"
      : input.sourceType === "cloud_link"
      ? "cloud"
      : input.sourceType === "pasted_text"
      ? "text"
      : input.sourceType === "local_manifest_json"
      ? "manifest"
      : input.sourceType === "existing_project_reference"
      ? "existing"
      : "local";

  const manifestType =
    input.sourceType === "uploaded_zip"
      ? "archive_manifest"
      : input.sourceType === "uploaded_document"
      ? "document_manifest"
      : input.sourceType === "github_url"
      ? "github_manifest"
      : input.sourceType === "cloud_link"
      ? "cloud_manifest"
      : input.sourceType === "local_manifest_json"
      ? "local_manifest"
      : input.sourceType === "existing_project_reference"
      ? "existing_project_manifest"
      : "file_manifest";

  return {
    source_input: {
      sourceType: input.sourceType,
      value: input.value,
    },
    intake_source: {
      provider,
      accepted: true,
    },
    source_manifest: {
      manifestType,
      summary: `Normalized ${input.sourceType}`,
    },
    extracted_context: {
      contextRef: `intake:${input.sourceType}:${Date.now()}`,
      extracted: true,
    },
    build_contract_context: {
      seededFromIntake: true,
      recommendedIntent: input.suggestedIntent || "generated_app_build",
    },
    planning: {
      required: true,
    },
    execution: {
      required: true,
    },
  };
}
