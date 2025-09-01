"use client";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-white shadow p-4 flex items-center justify-between">
      <Link href="/" className="text-xl font-bold text-blue-600">CAD-3D Demo</Link>
      <div className="space-x-6">
        <Link href="/upload" className="hover:text-blue-500">Upload</Link>
        <Link href="/editor" className="hover:text-blue-500">Editor</Link>
        <Link href="/share/1" className="hover:text-blue-500">Shared</Link>
      </div>
    </nav>
  );
}
