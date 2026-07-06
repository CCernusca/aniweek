const ANILIST_ENDPOINT = "https://graphql.anilist.co";

const WATCHING_LIST_QUERY = `
query ($userName: String) {
  MediaListCollection(userName: $userName, type: ANIME, status: CURRENT) {
    lists {
      entries {
        media {
          id
          siteUrl
          title {
            userPreferred
          }
          coverImage {
            medium
          }
          nextAiringEpisode {
            airingAt
            episode
          }
        }
      }
    }
  }
}
`;

/**
 * Fetches the anime a user is currently watching, from AniList.
 * @param {string} userName
 * @returns {Promise<Array<{id:number,siteUrl:string,title:string,cover:string,nextAiringEpisode:{airingAt:number,episode:number}|null}>>}
 */
async function fetchWatchingList(userName) {
  const response = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: WATCHING_LIST_QUERY,
      variables: { userName },
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    const message = payload?.errors?.[0]?.message || "Failed to reach AniList";
    throw new Error(message);
  }

  const lists = payload?.data?.MediaListCollection?.lists || [];
  const entries = lists.flatMap((list) => list.entries || []);

  return entries.map((entry) => ({
    id: entry.media.id,
    siteUrl: entry.media.siteUrl,
    title: entry.media.title.userPreferred,
    cover: entry.media.coverImage?.medium || "",
    nextAiringEpisode: entry.media.nextAiringEpisode || null,
  }));
}
