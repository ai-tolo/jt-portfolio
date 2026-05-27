// Auth-gated proxy: flip public=1/0 on a mix job's king variant asset.
// Optional `collection` label sets the Sounds-grouping field on the
// same asset row. Use this from the Winners king card so the publish
// action lives in the engineering workspace rather than on Buckets.

import type { APIRoute } from "astro";
import { publishMixKing } from "../../../lib/console-api";

export const POST: APIRoute = async ({ request }) => {
  let payload: {
    job_id?: unknown;
    publish?: unknown;
    collection?: unknown;
  };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const jobId = typeof payload.job_id === "number" ? payload.job_id : NaN;
  if (!Number.isFinite(jobId)) {
    return new Response(
      JSON.stringify({ error: "job_id must be a number" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
  const publish =
    typeof payload.publish === "boolean" ? payload.publish : true;
  const collection =
    typeof payload.collection === "string"
      ? payload.collection
      : payload.collection === null
        ? null
        : undefined;

  const result = await publishMixKing(jobId, publish, collection);
  if (!result.ok) {
    const status = result.error.kind === "http" ? result.error.status : 502;
    return new Response(JSON.stringify({ error: result.error }), {
      status,
      headers: { "content-type": "application/json" },
    });
  }
  return new Response(JSON.stringify(result.data), {
    headers: { "content-type": "application/json" },
  });
};
