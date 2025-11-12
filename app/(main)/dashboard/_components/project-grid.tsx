"use client"

import { useRouter } from "next/navigation";
import ProjectCard from "./project-card";


interface Project {
  _id: string;
  title: string;
  currentImageUrl: string;
  createdAt: number;
  width: number;
  height: number;
}

interface ProjectGridProps {
  projects: Project[];
}

const ProjectGrid = ({ projects }: ProjectGridProps) => {
    const router = useRouter();

    const handleEditProject = (projectId:string)=>{
        router.push(`/editor/${projectId}`);
    }

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" >
        {
            projects.map((project)=>(
                <ProjectCard 
                      key={project._id}
                      project={project}
                      onEdit={()=>{handleEditProject(project._id)}}
                
                />
            ))
        }
    </div>
    </>
  );
};

export default ProjectGrid