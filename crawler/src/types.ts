export type FeedItem = {
  id: string
  url: string
  created: number
  title: string
  content_text: string
} & Record<string, unknown>;

export type FeedMap = Record<string, FeedItem>

export type JSONFeedItem = Omit<FeedItem, "created">
export interface JSONFeed {
  version: 'https://jsonfeed.org/version/1',
  title: string,
  feed_url: string,
  items: JSONFeedItem[]
}

export type GeneralFeedConfig = {
  title: string;
  retention: number;
  domain: string;
}