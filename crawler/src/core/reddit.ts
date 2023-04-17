import {FeedMap, GeneralFeedConfig, JSONFeed} from "../types";
import {removeOldEntries} from "./fn/removeOldEntries";
import {FetchRedditData} from "../io/fetchRedditData";
import {toJsonFeed} from "./fn/toJsonFeed";
import {sortByDate} from "./fn/sortByDate";


export type RedditFeedConfig = {
  type: "reddit";
  topic: string;
  time: string;
  minScore: number;
} & GeneralFeedConfig

interface Param {
  source: {
    fetch: () => ReturnType<FetchRedditData>
  }
  state: {
    fetch: () => Promise<FeedMap>,
    write: (state: FeedMap) => Promise<unknown>;
    retention: number;
  },
  feed: {
    url: string;
    title: string;
    write: (feed: JSONFeed) => Promise<unknown>
  }
  config: RedditFeedConfig
}

export const handleReddit = async ({
                                     config,
                                     source,
                                     state,
                                     feed,
                                   }: Param): Promise<JSONFeed> => {
  const currentState = await state.fetch();
  console.log(`fetch reddit data. topic: ${config.topic} minScore: ${config.minScore} time: ${config.time}`);
  const response = await source.fetch();

  const posts = response.data.children ?? []

  const data: FeedMap = Object.fromEntries(
    posts
      .map(({data}) => data)
      .filter(({score}) => score >= config.minScore)
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

  const newState = removeOldEntries({...currentState, ...data}, state.retention);

  const jsonFeed = toJsonFeed({
    title: feed.title,
    feedUrl: feed.url,
    items: sortByDate(Object.values(newState))
  });

  await state.write(newState);
  await feed.write(jsonFeed);
  return jsonFeed;
}