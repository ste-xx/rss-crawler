import {FeedItem, FeedMap} from "../../types";

export const sortByDate = (items: FeedItem[]) => {
  return [...items].sort((a, b) => b.created - a.created)
}