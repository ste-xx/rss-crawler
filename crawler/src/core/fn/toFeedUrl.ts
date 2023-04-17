interface Param {
  domain: string;
  feed: string;
}
export const toFeedUrl = ({domain, feed}: Param) => {
  return `https://${domain}/${feed}.json`;
}