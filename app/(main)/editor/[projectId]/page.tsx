"use client"

import { useParams } from "next/navigation"

const Editor = async() => {
    const {projectId} = await useParams();
  return (
    <div>Editor : {projectId}</div>
  )
}

export default Editor