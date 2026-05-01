"use client";

import { useState } from "react";

type CommandSubmitResult = { ok: boolean; error?: string };
type Props = { onSubmit: (commandText: string) => CommandSubmitResult };

export function LiveUIBuilderCommandInput(props: Props) {
  const { onSubmit } = props;
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();

  const submit = (event: any) => {
    event.preventDefault();
    const text = value.trim();
    if (!text) return setError("Enter a command first.");
    const result = onSubmit(text);
    if (!result.ok) return setError(result.error ?? "Could not parse command.");
    setError(undefined);
    setValue("");
  };

  return (
    <form className="vibe-command-input" onSubmit={submit} aria-label="Live UI command input">
      <input type="text" style={{}} value={value} onChange={(event) => setValue(event.target.value)} placeholder='Type a UI command (e.g., rewrite this headline to "Elevated Luxury Stays")' />
      <button type="submit">Send</button>
      {error ? <p className="vibe-command-input-error" role="alert">{error}</p> : null}
    </form>
  );
}
