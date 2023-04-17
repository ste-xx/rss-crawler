
interface Response {
  hits: {
    title: string
    points: number
    objectID: string
  }[]
}

interface Param {
  minPoints: number
  days: number
}

export const fetchHackerNewsData = async (param: Param): Promise<Response> => {
  const currentTimestampInSeconds = parseInt(
    `${new Date().getTime() / 1000}`,
    10
  )
  const DAY_IN_SECONDS = 86400
  const lastTimestampInSeconds =
    currentTimestampInSeconds - DAY_IN_SECONDS * param.days

  const url = new URL('https://hn.algolia.com/api/v1/search')
  url.searchParams.append('query', '')
  url.searchParams.append('tags', 'story')
  url.searchParams.append('page', '0')
  url.searchParams.append('hitsPerPage', '1000')
  url.searchParams.append(
    'numericFilters',
    `created_at_i>${lastTimestampInSeconds},points>${param.minPoints}`
  )
  const response = await fetch(url);
  return response.json();
}

export type FetchHackerNewsData = typeof fetchHackerNewsData