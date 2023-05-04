import {JSONFeed, JSONFeedItem} from "../../types";

type ParamItem = JSONFeedItem & Record<string, unknown>;

interface Param {
  title: string;
  feedUrl: string;
  items: ParamItem[]
}

export const toJsonFeed = ({title, feedUrl, items}: Param): JSONFeed => {
  return {
    version: 'https://jsonfeed.org/version/1' as const,
    title,
    feed_url: feedUrl,
    items: [...items].map((item) => clearSurplusProperties(item))
  }
}

const clearSurplusProperties = ({id, title, url, content_text}: ParamItem): JSONFeedItem => {
  return ({
    id,
    title,
    content_text,
    url
  }) satisfies JSONFeedItem
}
