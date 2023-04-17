const createQueryPartial = (user: string): string => `
  ${user}: search(query: "${user}", type: USER, first: 1) {
    edges {
      node {
        ... on Organization {
          repositories(first: 10, orderBy: {field: CREATED_AT, direction: DESC}) {
            __typename
            edges {
              node {
                id
                name
                description
                createdAt
              }
            }
          }
        }
      }
    }
  }
`

interface Response {
  data: Record<
    string,
    {
      edges: {
        node: {
          repositories: {
            edges: {
              node: {
                id: string
                name: string
                description: string | null
                createdAt: string
              }
            }[]
          }
        }
      }[]
    }
  >
}

interface Param {
  names: string[]
  token: string
}

export const fetchGithubData = async (param: Param): Promise<Response> => {
  const query = `
      query {
        ${param.names.map(name => createQueryPartial(name)).join('\n')}
      }
    `;

  const response =  await fetch("https://api.github.com/graphql", {
    method: "POST",
    body: JSON.stringify({query}),
    headers: {
      authorization: `Bearer ${param.token}`,
      'user-agent': 'node.js'
    }
  });

  return response.json();
}
export type FetchRedditData = typeof fetchGithubData