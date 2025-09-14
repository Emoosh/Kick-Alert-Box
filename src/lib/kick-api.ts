const KICK_API_URL = "https://api.kick.com/public/v1";
const KICK_TOKEN_INTROSPECT_ENDPOINT = "/token/introspect";
const KICK_USERS_ENDPOINT = "/users";
const KICK_CHANNELS_ENDPOINT = "/channels";
const KICK_PATCH_CHANNELS_ENDPOINT = "/channels";

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

  console.log("Fetching from Kick API:", url);
  console.log("With options:", { ...options, headers });
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : null;
    } catch (error) {
      console.error("JSON parse error:", error);
      return null;
    }
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

export async function tokenIntrospect(accessToken: string) {
  const introspect = await fetchFromKick(
    KICK_TOKEN_INTROSPECT_ENDPOINT,
    accessToken,
    { method: "POST" }
  );
  return introspect;
}

/**
 * Get channel information
 */

export async function getCurrentChannelInfo(access_token: string) {
  return fetchFromKick(KICK_CHANNELS_ENDPOINT, access_token, {
    method: "GET",
  });
}

/**
 * Updates livestream metadata for a channel.
 */

interface UpdateChannelBody {
  category_id?: number;
  custom_tags?: string[];
  stream_title?: string;
}

export async function updateChannelInfo(
  access_token: string,
  category_id?: number,
  custom_tags?: string[],
  stream_title?: string
) {
  const body: UpdateChannelBody = {};
  if (category_id !== undefined) body.category_id = category_id;
  if (custom_tags !== undefined) body.custom_tags = custom_tags;
  if (stream_title !== undefined) body.stream_title = stream_title;

  try {
    return fetchFromKick(KICK_PATCH_CHANNELS_ENDPOINT, access_token, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("Error updating channel info:", error);
    throw error;
  }
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
