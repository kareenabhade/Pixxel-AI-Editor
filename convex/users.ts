import { mutation, query } from "./_generated/server";
import { v } from "convex/values";


export const store = mutation({
  args: { },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    console.log("identity :", identity);
    if(!identity){
        throw new Error("Called stored User without authentication present")
    } 
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

      console.log("user", user)

    if (user){
      if(user.name !== identity.name){
        await ctx.db.patch(user._id,{name: identity.name})
      }
      return user._id;
    }

    // Store new user
    return await ctx.db.insert("users", {
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
  },
});


export const getCurrentUsers = query({
  handler: async(ctx)=>{
      const identity = await ctx.auth.getUserIdentity();
       if(!identity) throw new Error("Not Authenticated");

      const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
              q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

      if(!user){
        throw new Error("User Not Found");
      }

      return user;
  }
})