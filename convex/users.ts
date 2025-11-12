import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Define mutation to store user
export const store = mutation({
  args: {},
  handler: async (ctx, _args) => {
    const identity = await ctx.auth.getUserIdentity();

    console.log("identity:", identity);
    if (!identity) {
      throw new Error("Called storeUser without authentication present");
    }

    // Check if the user already exists by tokenIdentifier
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    console.log("existing user:", existingUser);

    if (existingUser) {
      // Update the name if changed
      if (existingUser.name !== identity.name) {
        await ctx.db.patch(existingUser._id, { name: identity.name });
      }
      return existingUser._id as Id<"users">;
    }

    // Store new user if not found
    const newUserId = await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      name: identity.name ?? "Anonymous",
      email: identity.email ?? "",
      imageUrl: identity.pictureUrl,
      plan: "free",
      projectUsed: 0,
      exportsThisMonth: 0,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    });

    return newUserId;
  },
});

// Define query to get current user
export const getCurrentUser = query({
  
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not Authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User Not Found");
    }

    return user;
  },

});
