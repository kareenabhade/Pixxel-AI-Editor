import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Crown, Zap } from "lucide-react"
import { Alert, AlertDescription } from "./ui/alert"
import { PricingTable } from "@clerk/nextjs"
import { Button } from "./ui/button"

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  restrictedTool: string | null;
  reason: string | undefined;
}

const UpgradeModal = ({isOpen, onClose, restrictedTool, reason}: UpgradeModalProps) => {

    type ToolId = "background" | "ai_extender" | "ai_edit" | "projects" | string;

    const getToolName = (toolId: ToolId): string => {
      const toolNames: Record<string, string> = {
        background: "AI Background Tools",
        ai_extender: "AI Image Extender",
        ai_edit: "AI Editor",
        projects: "More than 3 projects",
      };
    
      return toolNames[toolId] ?? "Premium Feature";
    };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-4xl bg-slate-800 border-white/10 max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <div className="flex items-center gap-3">
        <Crown className="h-6 w-6 text-yellow-500"/>
        <DialogTitle className="text-2xl font-bold text-white">
            Upgrade to Pro
        </DialogTitle>
         </div>
      </DialogHeader>

      <div>
        {
        (restrictedTool && (
            <Alert>
                <Zap />
                <AlertDescription className="text-yellow-400">
                    <div className="text-yellow-500">
                        {getToolName(restrictedTool)} - Pro Feature
                    </div>
                    {reason || 
                    ` ${getToolName(restrictedTool)} is only available on the Pro plan. Upgrade now to unlock this powerful feature and more.`}
                </AlertDescription>
            </Alert>
        ))}
      <PricingTable
           checkoutProps={{
            appearance:{
                elements:{
                    drawerRoot:{
                        zIndex:20000,
                    }
                }
            }
           }} 
       />
      </div>

      <DialogFooter className="justify-center">
        <Button
            variant="ghost"
            onClick={()=>{onClose(false)}}
            className="text-white/70 hover:text-white"
        >
            Maybe Later

        </Button>
      </DialogFooter>

    </DialogContent>
    </Dialog>
    </>
  )
}

export default UpgradeModal