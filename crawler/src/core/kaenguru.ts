import {FeedMap, GeneralFeedConfig, JSONFeed} from "../types";
import {FetchKaenguruData} from "../io/fetchKaenguruData";
import {removeOldEntries} from "./fn/removeOldEntries";
import {toJsonFeed} from "./fn/toJsonFeed";
import {sortByDate} from "./fn/sortByDate";

export type KaenguruFeedConfig = {
  type: "kaenguru";
  daysOfWeek: number[];
  excludeTopics: string[];
} & GeneralFeedConfig


interface Param {
  source: {
    fetch: () => ReturnType<FetchKaenguruData>
  }
  state: {
    fetch: () => Promise<FeedMap>,
    write: (state: FeedMap) => Promise<unknown>
    retention: number;
  },
  feed: {
    url: string;
    title: string;
    write: (feed: JSONFeed) => Promise<unknown>
  }
  config: KaenguruFeedConfig
}

const cyrb53 = (str: string, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for(let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1  = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2  = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

export const handleKaenguru = async ({
                                     source,
                                     state,
                                     feed,
                                    config
                                   }: Param): Promise<JSONFeed> => {

  const currentState = await state.fetch();

  const response = await source.fetch();



  const data =  Object.fromEntries(response.items
      .filter(({topic}) => !config.excludeTopics.includes(topic.trim()))
      .map(({title, description , location, city, dateTime, formattedFetchDate, topic}) => {
        const id = cyrb53(`${formattedFetchDate}: ${topic}  ${title}`).toString();
        return [
          id,
          {
            id,
            url: `https://example.com`,
            created: new Date().getTime(),
            title: `${formattedFetchDate}: ${topic}  ${title}`,
            content_text: `
            ${description}
            
            ${location}
            ${city}
            
            ${dateTime.join("\n")}
          `
          }
        ];
      }));

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