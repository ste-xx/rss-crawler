/**
 * Welcome to Cloudflare Workers! This is your first scheduled worker.
 *
 * - Run `wrangler dev --local` in your terminal to start a development server
 * - Run `curl "http://localhost:8787/cdn-cgi/mf/scheduled"` to trigger the scheduled event
 * - Go back to the console to see what your worker has logged
 * - Update the Cron trigger in wrangler.toml (see https://developers.cloudflare.com/workers/wrangler/configuration/#triggers)
 * - Run `wrangler publish --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/runtime-apis/scheduled-event/
 */
import {AllTypes} from "../../crawler/src/index"
export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  CRAWLER: Fetcher
}


const handler = async (env: Env, config: AllTypes): Promise<Response> => {
  return env.CRAWLER.fetch("https://example.com", {method: "POST", body:  JSON.stringify(config)})
}


const redditRProgramming = {
  type: "reddit" as const,
  topic: "r/programming",
  title: "r/programming",
  time: "week",
  minScore: 500,
  retention: 10
}

export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
      await handler(env, redditRProgramming);
  },
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    if(request.url.endsWith("favicon.ico")){
      return new Response("", { status: 404});
    }
    const val = new URL(request.url).searchParams.get("type");

    if(val === "rprogramming"){
      return await handler(env, redditRProgramming);
    }

    return new Response("", { status: 404});
  },
};
