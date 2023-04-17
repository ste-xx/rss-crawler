interface Param {
  topic: string
  minScore: number
  time: string
}
interface Response {
  data: {
    children: {
      data: {
        id: string
        title: string
        score: number
        permalink: string
      }
    }[]
  }
}

export const fetchRedditData = async ({topic, time}: Param): Promise<Response> => {
  const url = new URL(`https://www.reddit.com/${topic}/top/.json`)
  url.searchParams.append('t', time)

  return await (await fetch(url)).json() as Response
}
export type FetchRedditData = typeof fetchRedditData