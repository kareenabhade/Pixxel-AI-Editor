"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    // <Auth0Provider
    //   domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN!}
    //   clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!}
    //   authorizationParams={{
    //     redirect_uri:
    //       typeof window === "undefined" ? undefined : window.location.origin,
    //   }}
    //   useRefreshTokens={true}
    //   cacheLocation="localstorage"
    // >
    // </Auth0Provider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
  );
}