"use client";

import { useRouter } from "next/navigation";
import ProjectCard from "./project-card";
import { Id, Doc } from "@/convex/_generated/dataModel";

interface ProjectGridProps {
  projects: Doc<"projects">[];
}

const ProjectGrid = ({ projects }: ProjectGridProps) => {
  const router = useRouter();

  // Use the correct Convex Id type
  const handleEditProject = (projectId: Id<"projects">) => {
    router.push(`/editor/${projectId}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {projects.map((project) => (
        <ProjectCard
          key={project._id}
          project={project}
          onEdit={() => handleEditProject(project._id)}
        />
      ))}
    </div>
  );
};

export default ProjectGrid;
