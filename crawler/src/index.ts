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
import {handleReddit, RedditFeedConfig} from "./core/reddit";
import {fetchRedditData} from "./io/fetchRedditData";
import {fetchGithubData} from "./io/fetchGithubData";
import {handleGithub, GitHubFeedConfig} from "./core/github";
import {HackerNewsFeedConfig, handleHackerNews} from "./core/hackerNews";
import {fetchHackerNewsData} from "./io/fetchHackerNewsData";
import {FeedMap, JSONFeed} from "./types";
import {toFeedUrl} from "./core/fn/toFeedUrl";
import {handleKaenguru, KaenguruFeedConfig} from "./core/kaenguru";
import {fetchKaenguruData} from "./io/fetchKaenguruData";

export interface Env {
    GITHUB_PAT: string

    // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
    KV: KVNamespace;
    //
    // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
    // MY_DURABLE_OBJECT: DurableObjectNamespace;
    //
    // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
    BUCKET: R2Bucket;
}


export type FeedConfig = (RedditFeedConfig | GitHubFeedConfig | HackerNewsFeedConfig | KaenguruFeedConfig)


interface RequestPayload {
    feed: string;
}


const getConfig = async (env: Env, feed: string): Promise<FeedConfig | null> => {
    const config = await env.KV.get(`config:${feed}`);
    return config ? JSON.parse(config) as FeedConfig : null;
}

const toResponse = (feed: JSONFeed) => new Response(JSON.stringify(feed), {
    headers: {
        "content-type": "application/json",
    },
})

export default {
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext
    ): Promise<Response> {

        const {feed} = (await request.json() as RequestPayload)

        const config = await getConfig(env, feed);
        if (config === null) {
            return new Response(`feed ${feed} not found`, {status: 404});
        }

        const stateFetcher = async () => {
            const state = await env.KV.get(`state:${feed}`);
            return JSON.parse(state ?? "{}");
        };
        const stateWriter = async (state: FeedMap) => await env.KV.put(`state:${feed}`, JSON.stringify(state, null, 2))

        const feedWriter = async (_feed: JSONFeed) => await env.BUCKET.put(`${feed}.json`, JSON.stringify(_feed, null, 2))

        const feedUrl = toFeedUrl({
            domain: config.domain,
            feed
        });

        if (config.type === 'kaenguru') {
            const jsonFeed = await handleKaenguru({
                config,
                source: {
                    fetch: async () => {
                        const arr = await Promise.all(
                            config.daysOfWeek.map(async dayOfWeek => (await fetchKaenguruData({dayOfWeek})).items )
                        );

                        return {
                            items: arr.reduce((acc, cur) => [...acc, ...cur], []),
                            html: async () => "not set"
                        };
                    }
                },
                state: {
                    fetch: stateFetcher,
                    write: stateWriter,
                    retention: config.retention
                },
                feed: {
                    write: feedWriter,
                    url: feedUrl,
                    title: config.title
                }
            })

            return toResponse(jsonFeed);

            // const response = await fetchKaenguruData({dayOfWeek: 7});
            // return new Response(await response.html(), {
            //     headers: {
            //         "content-type": "text/html",
            //     }
            // });
            //
            // return new Response(JSON.stringify( arr.reduce((acc, cur) => [...acc, ...cur], []), null, 2), {
            //     headers: {
            //         "content-type": "application/json",
            //     }
            // });
        }
        if (config.type === 'github') {
            const jsonFeed = await handleGithub({
                config,
                source: {
                    fetch: async () => await fetchGithubData({token: env.GITHUB_PAT, names: config.names})
                },
                state: {
                    fetch: stateFetcher,
                    write: stateWriter,
                    retention: config.retention
                },
                feed: {
                    write: feedWriter,
                    url: feedUrl,
                    title: config.title
                }
            })

            return toResponse(jsonFeed);

        } else if (config.type === 'reddit') {
            const jsonFeed = await handleReddit({
                config,
                source: {
                    fetch: () => fetchRedditData(config)
                },
                state: {
                    fetch: stateFetcher,
                    write: stateWriter,
                    retention: config.retention
                },
                feed: {
                    write: feedWriter,
                    url: feedUrl,
                    title: config.title
                }
            });

            return toResponse(jsonFeed);

        } else if (config.type === 'hackerNews') {
            const jsonFeed = await handleHackerNews({
                config,
                source: {
                    fetch: () => fetchHackerNewsData(config)
                },
                state: {
                    fetch: stateFetcher,
                    write: stateWriter,
                    retention: config.retention
                },
                feed: {
                    write: feedWriter,
                    url: feedUrl,
                    title: config.title
                }
            });

            return toResponse(jsonFeed);

        } else {
            // @ts-ignore
            return new Response(`unknown feed type ${config.type}`, {status: 400});
        }
    },
};
