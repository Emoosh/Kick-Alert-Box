import { Callback } from "ioredis";
import { tokenIntrospect } from "../kick-api";
import { getCurrentUser } from "../kick-api";
import { UserService } from "./user-service";
import { TokenManager } from "../auth/tokenManager";

interface CallBackData {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
}

interface TokenInfo {
  data: {
    active: boolean;
    client_id: string;
    token_type: string;
    scope: string[];
    exp: number;
  };
  message: string;
}

interface userData {
  data: [
    {
      user_id: number;
      name: string;
      email: string;
      profile_picture: string;
    }
  ];
  message: string;
}

interface UserData {}

export class UserCallbackService {
  static async handleOAuthCallback(
    callbackData: CallBackData,
    requestInfo?: { deviceInfo?: string; ipAddress?: string }
  ) {
    try {
      // 1. Token introspection to validate and get token info.
      const tokenInfo: TokenInfo = await this.tokenIntrospectAPI(
        callbackData.access_token
      );

      // 2. Get the current user infos.
      const userData: userData = await this.getUserData(
        callbackData.access_token
      );

      // 3. Save or update the user to database
      const user = await UserService.createOrUpdateUser({
        kickUserId: userData.data[0].user_id.toString(),
        username: userData.data[0].name,
        email: userData.data[0].email,
        profilePicture: userData.data[0].profile_picture,
      });

      // 5.1 Encrypt and save Access(both redis and db) and Refresh tokens (only db) to database.
      // 5.2 Create a session token associated with the user.

      // The scopes are not returning as an array it is string so i will first convert them into an array.

      const sessionToken = await TokenManager.storeTokens(
        user.id,
        callbackData.access_token,
        callbackData.refresh_token,
        callbackData.expires_in,
        callbackData.scope.split(" ").map((s) => s.trim()),
        requestInfo?.deviceInfo,
        requestInfo?.ipAddress
      );

      return {
        success: true,
        user,
        sessionToken,
        redirectUrl: "/dashboard",
      };
    } catch (error) {
      console.error("Error handling OAuth callback:", error);
      return {
        success: false,
        error: (error as Error).message,
        redirectUrl: "/login?error=callback_failed",
      };
    }
  }

  // 1. Token introspection to validate and get token info.

  private static async tokenIntrospectAPI(
    accessToken: CallBackData["access_token"]
  ): Promise<TokenInfo> {
    const tokenIntrospectResponse = await tokenIntrospect(accessToken);
    if (!tokenIntrospectResponse) {
      throw new Error("Failed to introspect token");
    }
    return tokenIntrospectResponse as TokenInfo;
  }

  // 2. Get the current user infos.
  private static async getUserData(accessToken: string) {
    const userDataResponse = await getCurrentUser(accessToken);
    if (!userDataResponse) {
      throw new Error("Failed to get user data");
    }
    return userDataResponse as userData;
  }

  // 3. Save or update the user to database.
  private static async saveOrUpdateUser(userData: any) {
    // Save or update user logic here
  }

  // 5. Redirect to dashboard with session token in cookie.
  private static async redirectToDashboard(sessionToken: string) {}
}
