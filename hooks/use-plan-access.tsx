import { useAuth } from "@clerk/nextjs";

export type ToolId =
  | "resize"
  | "crop"
  | "adjust"
  | "text"
  | "background"
  | "ai_extender"
  | "ai_edit"
  | "export";

export const usePlanAccess = () => {
  const { has } = useAuth();

  const isPro = has?.({ plan: "pro" }) || false;
  const isFree = !isPro;

  // Define tool access map with types
  const planAccess: Record<ToolId, boolean> = {
    resize: true,
    crop: true,
    adjust: true,
    text: true,

    background: isPro,
    ai_extender: isPro,
    ai_edit: isPro,
    export: isPro,
  };

  /** ✔ PROPERLY TYPED: returns boolean */
  const hasAccess = (toolId: ToolId): boolean => {
    return planAccess[toolId] === true;
  };

  const getRestrictedTools = (): ToolId[] => {
    return Object.entries(planAccess)
      .filter(([_, canUse]) => !canUse)
      .map(([toolId]) => toolId as ToolId);
  };

  const canCreateProject = (currentProjectCount: number): boolean => {
    if (isPro) return true;
    return currentProjectCount < 3;
  };

  const canExport = (currentExportThisMonth: number): boolean => {
    if (isPro) return true;
    return currentExportThisMonth < 20;
  };

  return {
    userPlan: isPro ? "pro" : "free_user",
    isPro,
    isFree,
    hasAccess,        // ✔ now correctly typed
    planAccess,
    getRestrictedTools,
    canCreateProject,
    canExport,
  };
};
