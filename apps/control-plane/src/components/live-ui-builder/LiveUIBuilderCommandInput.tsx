"use client";

import { FormEvent, useState } from "react";

export function LiveUIBuilderCommandInput({ onSubmit }: { onSubmit: (commandText: string) => { ok: boolean; error?: string } }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = value.trim();
    if (!text) {
      setError("Enter a command first.");
      return;
    }

    const result = onSubmit(text);
    if (!result.ok) {
      setError(result.error ?? "Could not parse command.");
      return;
    }

    setError(undefined);
    setValue("");
  };

  return (
    <form className="vibe-command-input" onSubmit={submit} aria-label="Live UI command input">
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Type a UI command (e.g., rewrite this headline to \"Elevated Luxury Stays\")"
      />
      <button type="submit">Send</button>
      {error ? <p className="vibe-command-input-error" role="alert">{error}</p> : null}
    </form>
  );
}
