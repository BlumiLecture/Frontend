function extractBackendMessage(data: any): string | null {
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    if (typeof data.detail === "string") return data.detail;
    if (typeof data.message === "string") return data.message;

    // DRF field errors: { field: ["..."] } or { field: "..."}
    const values = Object.values(data);
    for (const v of values) {
      if (typeof v === "string" && v.trim()) return v;
      if (Array.isArray(v) && v.length > 0) {
        const first = v[0];
        if (typeof first === "string" && first.trim()) return first;
      }
    }
  }
  return null;
}

export function getAuthErrorMessage(err: any, fallback: string) {
  const backendMsg = extractBackendMessage(err?.response?.data);
  if (backendMsg) return backendMsg;

  const msg: string | undefined = err?.message;
  if (msg) return msg;

  return fallback;
}

