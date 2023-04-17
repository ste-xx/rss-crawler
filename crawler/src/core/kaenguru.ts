// import {FeedMap, GeneralFeedConfig, JSONFeed} from "../types";
// import {removeOldEntries} from "./fn/removeOldEntries";
// import {FetchRedditData} from "../io/fetchRedditData";
// import {FetchHackerNewsData} from "../io/fetchHackerNewsData";
// import {toJsonFeed} from "./fn/toJsonFeed";
// import {sortByDate} from "./fn/sortByDate";
// import {FetchKaenguruData} from "../io/fetchKaenguruData";
//
//
// export type KaenguruFeedConfig = {
//   type: "kaenguru"
// } & GeneralFeedConfig
//
// interface Param {
//   source: {
//     fetch: () => ReturnType<FetchKaenguruData>
//   }
//   state: {
//     fetch: () => Promise<FeedMap>,
//     write: (state: FeedMap) => Promise<unknown>
//     retention: number;
//   },
//   feed: {
//     url: string;
//     title: string;
//     write: (feed: JSONFeed) => Promise<unknown>
//   }
//   config: KaenguruFeedConfig
// }
//
// export const handleKaenguru = async ({
//                                      source,
//                                      state,
//                                      feed,
//                                    }: Param): Promise<JSONFeed> => {
//   const currentState = await state.fetch();
//
//   const response = await source.fetch();
//
//   // const data = Object.fromEntries(
//   //   response.hits.map(({title, points, objectID}) => [
//   //     objectID,
//   //     {
//   //       id: objectID,
//   //       url: `https://news.ycombinator.com/item?id=${objectID}`,
//   //       created: new Date().getTime(),
//   //       title: `${title} (${points})`,
//   //       content_text: ''
//   //     }
//   //   ])
//   // )
//
//   const newState = removeOldEntries({...currentState, ...data}, state.retention);
//
//   const jsonFeed = toJsonFeed({
//     title: feed.title,
//     feedUrl: feed.url,
//     items: sortByDate(Object.values(newState))
//   });
//
//   await state.write(newState);
//   await feed.write(jsonFeed);
//   return jsonFeed;
// }