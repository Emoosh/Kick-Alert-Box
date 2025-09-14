import { sendFollowerAlert } from "../../../../ws-server";

export async function handleChannelFollow(data: any) {
  const followerName = data.follower.username;

  // WebSocket'e veri gönder
  sendFollowerAlert({
    username: followerName,
    message: "New follow!", // Bu opsiyonel
  });

  console.log(`New follower: ${followerName}`);
}
