import NextAuth from "next-auth"
import SpotifyProvider from "next-auth/providers/spotify"
import spotifyApi, { LOGIN_URL } from "../../../lib/spotify"
//This sets up the authorization to the spotify provider through Next Auth

async function refreshAccessToken(token) {
    try {

        spotifyApi.setAccessToken(token.accessToken);
        spotifyApi.setRefreshToken(token.refreshToken);

        const { body: refreshedToken } = await spotifyApi.refreshAccessToken();
        console.log("Refreshed token is", refreshedToken);

        return {
            ...token,
            accessToken: refreshedToken.access_token,
            accessTokenExpires: Date.now() + refreshedToken.expires_in * 1000,    //<------One Hour
            // Replace token if the old refresh token fails.
            refreshToken: refreshedToken.refresh_token ?? token.refreshToken, 
        }


    } catch (error) {
        console.error(error)

        return {
            ...token,
            error: "RefreshAccessTokenError",
        };
    }
}

export const authOptions = {
  // Configure one or more authentication providers
  providers: [
    SpotifyProvider({
      clientId: process.env.NEXT_PUBLIC_CLIENT_ID,
      clientSecret: process.env.NEXT_PUBLIC_CLIENT_SECRET,
      authorization: LOGIN_URL,
    }),
    // ...add more providers here
  ],
  secret: process.env.JWT_SECRET,
  pages:{
    signIn: '/login'
  },

  //This will allow for continuos login refresh. 
  callbacks: {
    async jwt({token, account, user}){
        //Initial Sign In
        if (account && user) {
            return {
                ...token, 
                accessToken: account.access_token,
                refreshToken: account.refresh_token,
                username: account.providerAccountId,
                accessTokenExpires: account.expires_at * 1000,
            }
        }
        //Return the previous token if the access token has not expires yet
        if (Date.now() < token.accessTokenExpires) {
            console.log("Existing Token is Valid")
            return token;
        }

        //If Access token is expired 
        console.log("Access token expired");
        return await refreshAccessToken(token);

    }
  }
}

export default NextAuth(authOptions)