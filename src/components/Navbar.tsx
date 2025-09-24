"use client";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-white shadow p-4 flex items-center justify-between">
      <Link href="/" className="text-xl font-bold text-blue-600">CAD-3D Demo</Link>
      <div className="space-x-6">
        <Link href="/" className="text-gray-600 hover:text-blue-600 transition-colors">Home</Link>
        <Link href="/r3f-viewer" className="text-gray-600 hover:text-blue-600 transition-colors">3D Viewer</Link>
        <Link href="/editor" className="text-gray-600 hover:text-blue-600 transition-colors">Floor Editor</Link>
        <Link href="/obj-to-glb" className="text-gray-600 hover:text-blue-600 transition-colors">OBJ Converter</Link>
      </div>
    </nav>
  );
}
