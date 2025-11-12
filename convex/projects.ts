import * as Users from "./users"
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api.js";
import { api } from "./_generated/api.js";

export const create = mutation({
  args: {
    title: v.string(),
    originalImageUrl: v.optional(v.string()),
    currentImageUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    width: v.number(),
    height: v.number(),
    canvasState: v.optional(v.any()),
  },

  // 👇 Explicit type annotation for handler return
  handler: async (ctx, args): Promise<string> => {
    // ✅ Get current user safely

    const user = await ctx.runQuery(api.users.getCurrentUser);

    if (!user) {
      throw new Error("User not authenticated");
    }

    // ✅ Check plan limits for free users
    if (user.plan === "free") {
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      if (projects.length >= 3) {
        throw new Error(
          "Free plan limited to 3 projects. Upgrade to Pro for unlimited projects."
        );
      }
    }

    // ✅ Create project
    const projectId: string = await ctx.db.insert("projects", {
      title: args.title,
      userId: user._id,
      originalImageUrl: args.originalImageUrl,
      currentImageUrl: args.currentImageUrl,
      thumbnailUrl: args.thumbnailUrl, // ✅ corrected field name
      width: args.width,
      height: args.height,
      canvasState: args.canvasState,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // ✅ Update user usage (match your schema!)
    await ctx.db.patch(user._id, {
      projectUsed: (user.projectUsed ?? 0) + 1, // use the exact schema key
      lastActiveAt: Date.now(),
    });

    return projectId;
  },
});


export const getUserProjects = query({
  // No arguments for this query
  args: {},

  // Type annotation for handler
  handler: async (ctx): Promise<any[]> => {
    // ✅ Get the currently authenticated user using internal query
    const user = await ctx.runQuery(api.users.getCurrentUser);

    if (!user) {
      throw new Error("User not authenticated");
    }

    // ✅ Fetch projects belonging to this user
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user_updated", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return projects;
  },
});

export const deleteProject = mutation({
  args:{projectId: v.id("projects")},
  handler: async(ctx, args)=>{
    const user = await ctx.runQuery(api.users.getCurrentUser);

    const project = await ctx.db.get(args.projectId);
    if(!project){
      throw new Error("Project not found");
    }

    if(!user || project.userId !== user._id){
      throw new Error("Access denied");
    }

    await ctx.db.delete(args.projectId);
    await ctx.  db.patch(user._id,{
      projectUsed: Math.max(0, user.projectUsed-1),
      lastActiveAt: Date.now(),
    });

    return {success: true}

  },
});

