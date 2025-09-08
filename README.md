# Kick Alert Box

This project implements OAuth authentication with Kick.com using the openid-client library. Users can login with their Kick account and grant access to your application.

## Setup

1. Register your application on Kick.com's developer portal to get your client ID and client secret.

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file with your Kick credentials:

```
KICK_CLIENT_ID=your_client_id_from_kick
KICK_CLIENT_SECRET=your_client_secret_from_kick
KICK_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) to see your application.

## OAuth Flow

The OAuth flow implemented in this application follows these steps:

1. User clicks "Connect with Kick" button
2. User is redirected to Kick's authorization page
3. User approves the permissions
4. Kick redirects back to your application's callback URL
5. Your application exchanges the authorization code for an access token
6. User is now authenticated and can use Kick API features

## API Usage

After authentication, you can use the Kick API with the obtained access token:

```typescript
import { getCurrentUser } from "@/lib/kick-api";

// In a server component or API route
const accessToken = cookies().get("access_token")?.value;
if (accessToken) {
  const userData = await getCurrentUser(accessToken);
  console.log(userData);
}
```

## Files Structure

- `src/lib/kick-oauth.ts` - OAuth client setup and token handling
- `src/lib/kick-api.ts` - API helper functions to call Kick endpoints
- `src/app/api/auth/login/route.ts` - Login route to start OAuth flow
- `src/app/api/auth/callback/route.ts` - Callback route to handle OAuth redirect
- `src/app/api/auth/logout/route.ts` - Logout route to clear tokens
- `src/app/page.tsx` - Home page with login/logout buttons

## Security Considerations

- This implementation uses PKCE (Proof Key for Code Exchange) for enhanced security
- Tokens are stored in HTTP-only cookies
- Remember to validate all user input and API responses
- Consider implementing token refresh mechanism for production use

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [openid-client](https://github.com/panva/openid-client) - the OAuth library used in this project.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
