"use client";

import { useState } from "react";

type Props = { onSubmit: (value: string) => { ok?: boolean; message?: string } | void; disabled?: boolean };

export function LiveUIBuilderCommandInput({ onSubmit, disabled }: Props) {
  const textareaId = "live-ui-builder-command-input";
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    if (!value.trim()) { setError("Enter a command first."); return; }
    const result = onSubmit(value);
    if (result && result.ok === false) { setError(result.message ?? "Could not parse command"); return; }
    setError(null);
    setValue("");
  };
  return (
    <div className="live-ui-builder-command-input">
      <label htmlFor={textareaId}>Live UI command</label>
      <textarea id={textareaId} value={value} disabled={disabled} onChange={(event) => setValue(event.target.value)} placeholder="Describe a safe UI edit" />
      <button type="button" disabled={disabled} onClick={submit}>Preview command</button>
      {error ? <p role="alert">{error === "Enter a command first." ? error : "Could not parse command"}</p> : null}
    </div>
  );
}
