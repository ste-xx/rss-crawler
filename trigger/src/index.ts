
export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  KV: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  CRAWLER: Fetcher
}

const handler = async (env: Env, payload: {feed: string}): Promise<Response> => {
  return env.CRAWLER.fetch("https://example.com", {method: "POST", body: JSON.stringify(payload)})
}

export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const list = await env.KV.list({prefix: "config:"});
    const allFeeds = list.keys.map((e) => e.name.replace("config:", ""));
    await Promise.allSettled(allFeeds.map(async (feed) => handler(env, {feed})));
  },
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    if (request.url.endsWith("favicon.ico")) {
      return new Response("", {status: 404});
    }

    if (request.url.endsWith("list")) {
      const list = await env.KV.list({prefix: "config:"});
      const allFeeds = list.keys.map((e) => e.name.replace("config:", ""))
      return new Response(JSON.stringify(allFeeds, null, 2));
    }

    const feed = new URL(request.url).searchParams.get("feed");
    if(feed === null){
      return new Response("missing feed parameter", {status: 400});
    }

    return await handler(env, {feed});
  },
};
