const KICK_API_URL = "https://api.kick.com/public/v1";
const KICK_TOKEN_INTROSPECT_ENDPOINT = "/token/introspect";
const KICK_USERS_ENDPOINT = "/users";

/**
 * Fetch data from Kick API with authentication token
 */
export async function fetchFromKick(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
) {
  const url = `${KICK_API_URL}${endpoint}`;

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching from Kick API:", error);
    throw error;
  }
}

/**
 * Get authenticated user information
 */
export async function getCurrentUser(accessToken: string) {
  const user = await fetchFromKick(KICK_USERS_ENDPOINT, accessToken);
  //  console.log("Fetched user_id:", user.data[0].user_id);
  return user;
}

/**
 * Get channel information
 */
export async function getChannelInfo(channelName: string, accessToken: string) {
  return fetchFromKick(`/channels/${channelName}`, accessToken);
}

/**
 * Get channel followers
 */
export async function getChannelFollowers(
  channelId: string,
  accessToken: string
) {
  return fetchFromKick(`/channels/${channelId}/followers`, accessToken);
}

/**
 * Get channel subscribers
 */
export async function getChannelSubscribers(
  channelId: string,
  accessToken: string
) {
  return fetchFromKick(`/channels/${channelId}/subscribers`, accessToken);
}
