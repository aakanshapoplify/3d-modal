/**
 * INTEGRATION EXAMPLES - REFERENCE ONLY
 * 
 * This file contains reference examples for integrating the Interactive3DViewer.
 * Each example is standalone and should be copied to your own files.
 * DO NOT import this file directly - it's documentation only.
 * 
 * Real-world examples of integrating the Interactive3DViewer
 * into various Next.js application scenarios
 */

/* eslint-disable */
// @ts-nocheck

// ============================================================================
// EXAMPLE 1: Basic Integration
// ============================================================================

"use client";

import Interactive3DViewer from "@/components/Interactive3DViewer";

export default function SimpleIntegration() {
  return (
    <div className="w-full h-screen">
      <Interactive3DViewer modelUrl="/models/building.glb" />
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: With Model Selection
// ============================================================================

"use client";

import { useState } from "react";
import Interactive3DViewer from "@/components/Interactive3DViewer";

export default function ModelSelector() {
  const [currentModel, setCurrentModel] = useState("/models/floor.glb");
  
  const models = [
    { id: 1, name: "Floor Plan", url: "/models/floor.glb" },
    { id: 2, name: "Building A", url: "/models/building-a.glb" },
    { id: 3, name: "Building B", url: "/models/building-b.glb" },
  ];
  
  return (
    <div className="w-full h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-100 p-4">
        <h2 className="font-bold mb-4">Select Model</h2>
        {models.map(model => (
          <button
            key={model.id}
            onClick={() => setCurrentModel(model.url)}
            className={`w-full p-2 mb-2 rounded ${
              currentModel === model.url 
                ? 'bg-blue-500 text-white' 
                : 'bg-white'
            }`}
          >
            {model.name}
          </button>
        ))}
      </div>
      
      {/* Viewer */}
      <div className="flex-1">
        <Interactive3DViewer 
          modelUrl={currentModel} 
          key={currentModel} // Force remount on change
        />
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: With Color Persistence (LocalStorage)
// ============================================================================

"use client";

import { useState, useEffect } from "react";
import Interactive3DViewer from "@/components/Interactive3DViewer";

export default function PersistentColors() {
  const [savedColors, setSavedColors] = useState<Map<string, string>>(new Map());
  
  // Load saved colors on mount
  useEffect(() => {
    const saved = localStorage.getItem("modelColors");
    if (saved) {
      const parsed = JSON.parse(saved);
      setSavedColors(new Map(Object.entries(parsed)));
    }
  }, []);
  
  // Save colors function (would be passed to viewer via context)
  const saveColors = (colors: Map<string, string>) => {
    const obj = Object.fromEntries(colors);
    localStorage.setItem("modelColors", JSON.stringify(obj));
    setSavedColors(colors);
  };
  
  return (
    <div className="w-full h-screen">
      <Interactive3DViewer modelUrl="/models/building.glb" />
      {/* Note: This example shows the concept. 
          Full implementation requires modifying the component */}
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: With Backend Integration
// ============================================================================

"use client";

import { useState, useEffect } from "react";
import Interactive3DViewer from "@/components/Interactive3DViewer";

interface SavedProject {
  id: string;
  name: string;
  modelUrl: string;
  colors: Record<string, string>;
}

export default function BackendIntegration() {
  const [project, setProject] = useState<SavedProject | null>(null);
  
  // Load project from API
  useEffect(() => {
    fetch("/api/projects/123")
      .then(res => res.json())
      .then(data => setProject(data));
  }, []);
  
  // Save project to API
  const saveProject = async (colors: Map<string, string>) => {
    if (!project) return;
    
    const updated = {
      ...project,
      colors: Object.fromEntries(colors),
    };
    
    await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  };
  
  if (!project) return <div>Loading...</div>;
  
  return (
    <div className="w-full h-screen">
      <Interactive3DViewer modelUrl={project.modelUrl} />
      {/* Add save button that calls saveProject */}
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: Multi-Page Dashboard
// ============================================================================

"use client";

import { useState } from "react";
import Interactive3DViewer from "@/components/Interactive3DViewer";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("viewer");
  const [stats, setStats] = useState({ colorsChanged: 0, lastSaved: null });
  
  return (
    <div className="w-full h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4">
        <h1 className="text-2xl font-bold">Building Design Studio</h1>
      </header>
      
      {/* Navigation */}
      <nav className="bg-gray-700 text-white flex gap-4 p-2">
        <button 
          onClick={() => setActiveTab("viewer")}
          className={activeTab === "viewer" ? "font-bold" : ""}
        >
          3D Viewer
        </button>
        <button 
          onClick={() => setActiveTab("stats")}
          className={activeTab === "stats" ? "font-bold" : ""}
        >
          Statistics
        </button>
      </nav>
      
      {/* Content */}
      <div className="flex-1">
        {activeTab === "viewer" && (
          <Interactive3DViewer modelUrl="/models/building.glb" />
        )}
        
        {activeTab === "stats" && (
          <div className="p-8">
            <h2 className="text-xl font-bold mb-4">Project Statistics</h2>
            <p>Colors Changed: {stats.colorsChanged}</p>
            <p>Last Saved: {stats.lastSaved || "Never"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 6: With Custom Controls
// ============================================================================

"use client";

import { useState, useRef } from "react";
import Interactive3DViewer from "@/components/Interactive3DViewer";

export default function CustomControls() {
  const viewerRef = useRef(null);
  const [viewMode, setViewMode] = useState("orbit");
  
  const presetViews = {
    front: { position: [0, 5, 10], target: [0, 0, 0] },
    top: { position: [0, 20, 0], target: [0, 0, 0] },
    side: { position: [10, 5, 0], target: [0, 0, 0] },
  };
  
  return (
    <div className="w-full h-screen relative">
      {/* Custom Control Panel */}
      <div className="absolute top-4 right-4 z-10 bg-white p-4 rounded-lg shadow-lg">
        <h3 className="font-bold mb-2">Camera Views</h3>
        <div className="flex flex-col gap-2">
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded"
            onClick={() => {/* Set camera to front view */}}
          >
            Front View
          </button>
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded"
            onClick={() => {/* Set camera to top view */}}
          >
            Top View
          </button>
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded"
            onClick={() => {/* Set camera to side view */}}
          >
            Side View
          </button>
        </div>
      </div>
      
      <Interactive3DViewer 
        modelUrl="/models/building.glb"
        ref={viewerRef}
      />
    </div>
  );
}

// ============================================================================
// EXAMPLE 7: Responsive Layout
// ============================================================================

"use client";

import Interactive3DViewer from "@/components/Interactive3DViewer";

export default function ResponsiveLayout() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile: Stack vertically */}
      <div className="lg:hidden">
        <div className="h-96 bg-white">
          <Interactive3DViewer modelUrl="/models/building.glb" />
        </div>
        <div className="p-4">
          <h2 className="text-xl font-bold">Building Details</h2>
          <p>View and customize your building design</p>
        </div>
      </div>
      
      {/* Desktop: Side by side */}
      <div className="hidden lg:flex h-screen">
        <div className="w-1/3 p-8 overflow-auto">
          <h2 className="text-2xl font-bold mb-4">Building Details</h2>
          <p>View and customize your building design</p>
        </div>
        <div className="flex-1">
          <Interactive3DViewer modelUrl="/models/building.glb" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 8: With Loading States
// ============================================================================

"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const Interactive3DViewer = dynamic(
  () => import("@/components/Interactive3DViewer"),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-lg font-medium">Loading 3D Viewer...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait</p>
        </div>
      </div>
    )
  }
);

export default function LoadingStates() {
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simulate API call to get model URL
    setTimeout(() => {
      setModelUrl("/models/building.glb");
      setIsLoading(false);
    }, 1000);
  }, []);
  
  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div>Loading model information...</div>
      </div>
    );
  }
  
  return (
    <div className="w-full h-screen">
      {modelUrl && <Interactive3DViewer modelUrl={modelUrl} />}
    </div>
  );
}

// ============================================================================
// EXAMPLE 9: With Error Boundaries
// ============================================================================

"use client";

import { Component, ReactNode } from "react";
import Interactive3DViewer from "@/components/Interactive3DViewer";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Failed to Load 3D Viewer
            </h2>
            <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

export default function WithErrorBoundary() {
  return (
    <div className="w-full h-screen">
      <ErrorBoundary>
        <Interactive3DViewer modelUrl="/models/building.glb" />
      </ErrorBoundary>
    </div>
  );
}

// ============================================================================
// EXAMPLE 10: Full-Featured Application
// ============================================================================

"use client";

import { useState, useEffect } from "react";
import Interactive3DViewer from "@/components/Interactive3DViewer";

interface Project {
  id: string;
  name: string;
  modelUrl: string;
  thumbnail: string;
  lastModified: string;
}

export default function FullFeaturedApp() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  useEffect(() => {
    // Load projects from API
    fetch("/api/projects")
      .then(res => res.json())
      .then(data => {
        setProjects(data);
        if (data.length > 0) setSelectedProject(data[0]);
      });
  }, []);
  
  return (
    <div className="w-full h-screen flex flex-col bg-gray-900">
      {/* Top Bar */}
      <header className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-700 rounded"
          >
            ☰
          </button>
          <h1 className="text-xl font-bold">
            {selectedProject?.name || "3D Building Viewer"}
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">
            Save
          </button>
          <button className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">
            Export
          </button>
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-80 bg-gray-800 text-white p-4 overflow-auto">
            <h2 className="text-lg font-bold mb-4">Projects</h2>
            <div className="space-y-2">
              {projects.map(project => (
                <div
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className={`p-3 rounded cursor-pointer transition ${
                    selectedProject?.id === project.id
                      ? 'bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <div className="font-medium">{project.name}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Modified: {project.lastModified}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
        
        {/* Main Viewer */}
        <main className="flex-1">
          {selectedProject ? (
            <Interactive3DViewer 
              modelUrl={selectedProject.modelUrl}
              key={selectedProject.id}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-white">
              <p>Select a project to begin</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ============================================================================
// API ROUTE EXAMPLES
// ============================================================================

// pages/api/projects/index.ts
/*
export default async function handler(req, res) {
  if (req.method === "GET") {
    const projects = await db.projects.findMany();
    res.json(projects);
  } else if (req.method === "POST") {
    const project = await db.projects.create({ data: req.body });
    res.json(project);
  }
}
*/

// pages/api/projects/[id].ts
/*
export default async function handler(req, res) {
  const { id } = req.query;
  
  if (req.method === "GET") {
    const project = await db.projects.findUnique({ where: { id } });
    res.json(project);
  } else if (req.method === "PUT") {
    const project = await db.projects.update({
      where: { id },
      data: req.body,
    });
    res.json(project);
  }
}
*/
