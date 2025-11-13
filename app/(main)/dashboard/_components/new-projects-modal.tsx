import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useConvexMutation, useConvexQuery } from "@/hooks/use-convex-query";
import { usePlanAccess } from "@/hooks/use-plan-access";
import {  Crown, ImageIcon, Loader2, Upload, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {useDropzone} from 'react-dropzone';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import UpgradeModal from "@/components/upgrade-modal";

interface newProjectModalPrps{
    isOpen: boolean,
    onClose: Function
}

const NewProjectModal = ({isOpen, onClose}: newProjectModalPrps) => {
    const [isUploading, setIsUploading] = useState(false);
    const [projectTitle, setProjectTitle] = useState("");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [showUpgradeModal, setShowUpgadeModal] = useState(false);

    const router = useRouter();

    const handleClose = ()=>{
        setSelectedFile(null);
        setPreviewUrl(null);
        setProjectTitle("");
        setIsUploading(false);
        onClose();
    }

   const handleCreateProject = async()=>{
      if(!canCreate){
          setShowUpgadeModal(true);
          return;
      }

      if(!selectedFile || !projectTitle.trim()){
        toast.error("Please select an image and enter a project title");
        return;
      }

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("fileName", selectedFile.name);

        const uploadResponse = await fetch("/api/imagekit/upload",{
          method: "POST",
          body: formData
        })

        const uploadData = await uploadResponse.json();
        if(!uploadData.success){
          throw new Error(uploadData.error || "Failed to upload image"); 
        }

        const projectId = await createProject({
          title: projectTitle.trim(),
          originalImageUrl: uploadData.url,
          currentImageUrl: uploadData.url,
          thumbnailUrl: uploadData.thumbnailUrl,
          width: uploadData.width || 800,
          height: uploadData.height || 600,
          canvasState: null,
        })

        toast.success("Project created successfully!");
        router.push(`/editor/${projectId}`);
      } catch (error: unknown) {
  console.error("Error creating project:", error);

  if (error instanceof Error) {
    toast.error(error.message);
  } else {
    toast.error("Failed to create project. Please try again.");
  }
}
finally{
        setIsUploading(false);
      }
    };

    const {data:projects} = useConvexQuery(api.projects.getUserProjects);
    const {mutate: createProject} = useConvexMutation(api.projects.create);
    const currentProjectCount = projects?.length || 0;
    
    const {isFree, canCreateProject} = usePlanAccess();
    const canCreate = canCreateProject(currentProjectCount);

    const onDrop = useCallback((acceptedFiles:any) => {
     const file = acceptedFiles[0];
     if(file){
       setSelectedFile(file);
       setPreviewUrl(URL.createObjectURL(file));
       const nameWithoutExt = file.name.replace(/\..[^/.]+$/,"");
       setProjectTitle(nameWithoutExt || "Untitled Project");
     }
    }, [])

    const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop, 
    accept:{
      "image/*":[".png", ".jpg", ".jpeg", ".webp", ".gif"],
    },
    maxFiles:1,
    maxSize: 20*1024*1024,
  });

  return (
    <>
     <Dialog open={isOpen} onOpenChange={handleClose}>
     <DialogContent>
       <DialogHeader>
         <DialogTitle>Are you absolutely sure?</DialogTitle>
         {isFree &&
          <Badge className="bg-slate-700 text-white/70">
            {currentProjectCount}/3 projects
          </Badge>
         }
       </DialogHeader>

       <div className="space-y-6">
        {isFree && currentProjectCount >=2 &&
            <Alert className="bg-amber-500/10 border-amber-500/20">
              <Crown />
              <AlertDescription>
                <div className="font-semibold text-amber-400 mb-1">
                  {currentProjectCount === 2? " Last Free Project" : "Project Limit  Reached"}
                  {currentProjectCount === 2? 
                    "This willl be your last free project. Upgrade to Pixxel Pro for unlimited projects." 
                  : "Free plan is limited to 3 projects. Upgrade to Pixxel Pro to create more  "}

                </div>
              </AlertDescription>
            </Alert>
        }
       </div>

      {/* Upload Area */}

      {!selectedFile ? 
      <div {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all 
                  ${ isDragActive
                   ? "border-cyan-400 bg-cyan-400/5"
                   : "border-white/20 hover:border-white/40"}
                   ${!canCreate ? "opacity-50 ": ""}
                   `}>
      <input {...getInputProps()} />
      <Upload className="h-12 w-12 text-white/50 mx-auto mb-4"/>
      <h3 className="text-xl font-semibold text-white mb-2">
      {isDragActive ?
          "Drop your files here" :
          "Upload an image"
      }</h3>
      <p className="text-white/70 mb-4">
        {canCreate? 
        "Drag and drop your image, or click to browse"
        :"Upgrade to Pro to create more projects"}
      </p>{" "}
      <p className="text-sm text-white/50">
        Supports PNG, WEBP up to 20MB
      </p>
    </div>
    : <div>
      <div className="relative space-y-3 ">
       {previewUrl && (
          <img 
            src={previewUrl}
            alt="Preview"
            className="w-full h-64 object-cover rounded-xl border border-white/10"
          />
        )}
        
         <Button
             variant="ghost"
             size="icon"
             className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
             onClick={()=>{
              setSelectedFile(null);
              setPreviewUrl(null);
              setProjectTitle("");
             }}>
          <X className="h-4 w-4"/>
         </Button>

         <div className="space-y-2">
          <Label className="text-white" htmlFor="project-title">
            Project Title
          </Label>
          <Input 
              id="project-title"
              type="text"
              value={projectTitle}
              onChange={(e)=>setProjectTitle(e.target.value)}
              placeholder="Enter project name..."
              className="bg-slate-700 border-white/20 text-white placeholder-white/50 focus:border-cyan-400 focus:ring-cyan-400"
          />
         </div>

         <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <ImageIcon className="h-5 w-5 text-cyan-400"/>
            <div>
              <p className="text-white font-medium">{selectedFile.name}</p>
              <p className="text-white/70 text-sm">{(selectedFile.size /1024/ 1024).toFixed(2)} MB</p>
            </div>
          </div>
         </div>
      </div>
      </div>}

       <DialogFooter className="gap-3">
        <Button
          variant="ghost"
          onClick={handleClose}
          disabled={isUploading}
          className="text-white/70 hover:text-white" >
          Cancel
        </Button>

        <Button
           onClick={handleCreateProject}
           disabled={!selectedFile || !projectTitle.trim() || isUploading}
           variant="primary" 
        >
          {isUploading?
          <> <Loader2 className="h-4 w-4 animate-spin"/> Creating...
          </>:"Create Project"}
        </Button>
       </DialogFooter>
     </DialogContent>
     </Dialog>

      <UpgradeModal 
            isOpen={showUpgradeModal}
            onClose={()=>{setShowUpgadeModal(false)}}
            restrictedTool="projects"
            reason="Free plan limited to 3 projects. Upgrade to Pro for unlimited projects and access to all AI editing tools."
      />

     

    </>
  )
}

export default NewProjectModal