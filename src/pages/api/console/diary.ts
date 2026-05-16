import type { APIRoute } from "astro";
import { appendEntry } from "../../../lib/diary-notion";

export const POST: APIRoute = async ({ request, redirect }) => {
  let text = "";
  try {
    const form = await request.formData();
    text = String(form.get("text") ?? "").trim();
  } catch {
    return redirect("/portal/diary?error=parse", 303);
  }

  if (!text) {
    return redirect("/portal/diary?error=empty", 303);
  }

  try {
    await appendEntry(text);
  } catch (e) {
    console.error("diary append failed:", e);
    return redirect("/portal/diary?error=notion", 303);
  }

  return redirect("/portal/diary?ok=1", 303);
};
