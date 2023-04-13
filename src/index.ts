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

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
}

export interface FeedItem {
  id: string
  url: string
  created: number
  title: string
  content_text: string
}

export type FeedMap = Record<string, FeedItem>

interface RedditResponse {
  data: {
    children: {
      data: {
        id: string
        title: string
        score: number
        permalink: string
      }
    }[]
  }
}

interface FetchRedditDataParams {
  topic: string
  minScore: number
  time: string
}


type Days = number
export const removeOldEntries = (map: FeedMap, retention: Days): FeedMap => {
  const DAY_IN_MS = 86400000
  const deleteAfter = DAY_IN_MS * retention
  return Object.fromEntries(
    Object.entries(map).filter(
      ([, {created = 0}]) => new Date().getTime() - created < deleteAfter
    )
  )
}

export const fetchRedditData = async ({topic, time}: FetchRedditDataParams): Promise<RedditResponse> => {
  const url = new URL(`https://www.reddit.com/${topic}/top/.json`)
  url.searchParams.append('t', time)

  return await (await fetch(url)).json() as RedditResponse
}

interface HandleRedditParams {
  fetchRedditData: typeof fetchRedditData
  fetchState: () => Promise<FeedMap>
  input: Input
}

interface Input {
  topic: string;
  minScore: number;
  time: string;
  feedUrl: string;
  title: string;
  retention: number;
}

const handleReddit = async ({input, fetchRedditData, fetchState}: HandleRedditParams) => {
  const state = await fetchState();
  const redditResponse = await fetchRedditData(input);

  const posts = redditResponse.data.children ?? []

  const data: FeedMap = Object.fromEntries(
    posts
      .map(({data}) => data)
      .filter(({score}) => score >= input.minScore)
      .map(({id, title, score, permalink}) => [
        id,
        {
          id,
          url: `https://reddit.com${permalink}`,
          created: new Date().getTime(),
          title: `${title} (${score})`,
          content_text: ``
        }
      ])
  );

  const newState = removeOldEntries({...state, ...data}, input.retention);
  const items = Object.entries(newState)
    .map(([, item]) => item)
    .sort((a, b) => a.created - b.created)

  return {
    version: 'https://jsonfeed.org/version/1',
    title: input.title,
    feed_url: input.feedUrl,
    items: items.reverse().map(({id, title, url, content_text}) => ({
      id,
      title,
      content_text,
      url
    }))
  }
}

export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {


    const feed = await handleReddit({
      input: {
        feedUrl: "https://rss.breitenstein.dev/rprogramming",
        topic: "r/programming",
        title: "r/programming",
        time: "week",
        minScore: 500,
        retention: 10
      },
      fetchRedditData,
      fetchState: async () => ({}),
    });

    console.log(feed);
  },
  async fetch(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {


    const feed = await handleReddit({
      input: {
        feedUrl: "https://rss.breitenstein.dev/rprogramming",
        topic: "r/programming",
        title: "r/programming",
        time: "week",
        minScore: 500,
        retention: 10
      },
      fetchRedditData,
      fetchState: async () => ({}),
    });

    console.log(feed);
  },
};
