export type TruthState =
  | "loading"
  | "connected"
  | "not_connected"
  | "unverified"
  | "empty"
  | "error";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; state: TruthState; message: string; status?: number };
