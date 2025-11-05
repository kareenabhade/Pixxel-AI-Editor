import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { title } from "process";

// @snippet start schema
export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string() ?? "",
    tokenIdentifier: v.string(),
    imageUrl: v.optional(v.string()),

    plan: v.union(v.literal("free"), v.literal("pro")),

    //Usage tracking for plan limits
    projectUsed: v.number(), // current project count
    exportsThisMonth: v.number(), // monthly export limit usage

    createdAt: v.number(),
    lastActiveAt: v.number(),


  }).index("by_token",["tokenIdentifier"],)
    .index("by_email",["email"])
    .searchIndex("searxh_name",{searchField:"name"})
    .searchIndex("search_email", {searchField:"email"}),

  
  projects: defineTable({
    title: v.string(),
    userId: v.id("users"),

    // Canvas dimension and state
    canvasState: v.any(),
    width: v.number(),
    height: v.number(),

    // Image Pipeline - tracks image transformations
    originalImageUrl: v.optional(v.string()),
    currentImageUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),

    // ImageKit transformation state
    activeTransformations: v.optional(v.string()),

    // AI feature state
    backgroundRemoved: v.optional(v.boolean()),

    // Organization
    folderId: v.optional(v.id("folders")),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"])
    .index("by_folder", ["folderId"]),


    folder: defineTable({
      name:v.string(),
      userId: v.id("users"),
      createdAt: v.number(),
    })
     .index("by_user",["userId"]),
});

// PLAN LIMITS EXAMPLE
// Free - 3 projects, 20 exports/month, basic feature only
// Pro - unlimited projects/exports, all AI features