"use client";
import { useState } from "react";
import StagingEditor from "@/components/StagingEditor";
import axios from "axios";

export default function EditorPage() {
  const [projectId, setProjectId] = useState<number | null>(null);

  const handleSaveProject = async () => {
    const res = await axios.post("/api/project", {
      urn: "your-model-urn",
      objects: [], // later capture staging positions
    });
    setProjectId(res.data.id);
  };

  return (
    <div>
      <StagingEditor />
      <div className="mt-4 flex gap-4">
        <button
          onClick={handleSaveProject}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Save Project
        </button>

        {projectId && (
          <a
            href={`/share/${projectId}`}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            View Shared Link
          </a>
        )}
      </div>
    </div>
  );
}
