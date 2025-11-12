import { useAuth } from "@clerk/nextjs"

export const usePlanAccess = () => {
    const {has} = useAuth();

    const isPro = has?.({plan:"pro"}) || false;
    const isFree = !isPro;

    const planAccess = {
        // Free plan tools
        resize: true,
        crop: true,
        adjust: true,
        text: true,

        // Pro-only tools
        background: isPro,
        ai_extender: isPro,
        ai_edit: isPro,
    }

    const hasAccess = (toolId:string)=>{

    }

    const getRestrictedTools = ()=>{
        return Object.entries(planAccess)
            .filter(([_, hasAccess])=>!hasAccess)
            .map(([toolId])=>toolId);
    }

    const canCreateProject = (currentProjectCount:number)=>{
        if(isPro) return true;
        return currentProjectCount<3; // free limit
    }

     const canExport = (currentExportThisMonth:number)=>{
        if(isPro) return true;
        return currentExportThisMonth<20; // free limit
    }

  return {
    userPlan: isPro?"pro": "free_user",
    isPro,
    isFree,
    hasAccess,
    planAccess,
    getRestrictedTools,
    canCreateProject,
    canExport,
  }
}
