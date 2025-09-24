"use client";
import { Suspense } from "react";
import FloorEditor from "@/components/FloorEditor";
import ClientOnly from "@/components/ClientOnly";

export default function EditorPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full h-screen">
        <ClientOnly fallback={<div className="w-full h-screen flex items-center justify-center text-gray-500">Loading 3D Floor Editor...</div>}>
          <Suspense fallback={<div className="w-full h-screen flex items-center justify-center text-gray-500">Loading 3D Floor Editor...</div>}>
            <FloorEditor />
          </Suspense>
        </ClientOnly>
      </div>
    </div>
  );
}
