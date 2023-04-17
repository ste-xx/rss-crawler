import {FeedMap, GeneralFeedConfig, JSONFeed} from "../types";
import {removeOldEntries} from "./fn/removeOldEntries";
import {FetchRedditData} from "../io/fetchGithubData";
import {toJsonFeed} from "./fn/toJsonFeed";
import {sortByDate} from "./fn/sortByDate";


export type GitHubFeedConfig = {
  type: "github"
  names: string[]
} & GeneralFeedConfig

interface Param {
  source: {
    fetch: () => ReturnType<FetchRedditData>
  }
  state: {
    fetch: () => Promise<FeedMap>;
    write: (state: FeedMap) => Promise<unknown>;
    retention: number;
  },
  feed: {
    url: string;
    title: string;
    write: (feed: JSONFeed) => Promise<unknown>
  }
  config: GitHubFeedConfig
}

export const handleGithub = async ({
                                     config,
                                     source,
                                     state,
                                     feed,
                                   }: Param): Promise<JSONFeed> => {
  const currentState = await state.fetch();

  const response = await source.fetch();
  const result = response.data ?? {};

  const sevenDaysAgo: Date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const data: FeedMap = Object.fromEntries(
    Object.entries(result)
      .flatMap(([username, entry]) =>
        entry.edges
          .flatMap(e =>
            e.node.repositories.edges
              .filter(e => sevenDaysAgo.getTime() < new Date(e.node.createdAt).getTime() )
              .map(({node: {id, name, description}}) => [
              id,
              {
                id,
                url: `https://github.com/${username}/${name}`,
                created: new Date().getTime(),
                title: `${username}: ${name}`,
                content_text: description ?? ''
              }
            ])
          )
      )
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