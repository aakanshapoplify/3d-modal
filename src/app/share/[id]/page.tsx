"use client";
import { useEffect, useState } from "react";
import Viewer3D from "@/components/Viewer3D";
import axios from "axios";

export default function SharePage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Fetch project details
  useEffect(() => {
    axios.get("/api/project").then((res) => {
      const found = res.data.find((p: any) => p.id === Number(params.id));
      setProject(found);
    });
  }, [params.id]);

  // Fetch Forge access token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await axios.get("/api/forge-token"); // Your API that returns { access_token: string }
        setAccessToken(res.data.access_token);
      } catch (err) {
        console.error("Failed to fetch Forge token:", err);
      }
    };
    fetchToken();
  }, []);

  if (!project || !accessToken) return <p>Loading project...</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Preview: Project #{project.id}</h2>
      <Viewer3D urn={project.urn} accessToken={accessToken} />
    </div>
  );
}
