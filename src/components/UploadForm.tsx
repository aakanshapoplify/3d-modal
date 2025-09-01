"use client";
import { useState } from "react";
import axios from "axios";

export default function UploadForm({ onSuccess }: { onSuccess: (url: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [fileType, setFileType] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    
    if (selectedFile) {
      const extension = selectedFile.name.split('.').pop()?.toLowerCase();
      setFileType(extension || "");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("/api/upload", formData, {
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded * 100) / e.total!));
        },
      });
      console.log(res,"res",res.data.urn,"res.data.urn",res.data);
      onSuccess(res.data.urn);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  const is3DFile = (type: string) => {
    const threeDFormats = ['rvt', 'dwg', 'ifc', 'nwd', 'nwc', '3ds', 'obj', 'fbx', 'dae', 'stl', 'ply'];
    return threeDFormats.includes(type);
  };

  const is2DFile = (type: string) => {
    const twoDFormats = ['dxf', 'dwg', 'pdf', 'jpg', 'jpeg', 'png', 'bmp', 'tiff'];
    return twoDFormats.includes(type);
  };

  return (
    <div className="p-6 border rounded-lg shadow-lg bg-white">
      <h3 className="text-lg font-semibold mb-4">Upload Your File</h3>
      
      <div className="mb-4">
        <input 
          type="file" 
          accept=".dxf,.dwg,.rvt,.ifc,.nwd,.nwc,.3ds,.obj,.fbx,.dae,.stl,.ply,.pdf,.jpg,.jpeg,.png,.bmp,.tiff"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {file && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p className="text-sm text-gray-700">
            <strong>File:</strong> {file.name}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Type:</strong> {fileType.toUpperCase()}
          </p>
          {is3DFile(fileType) && (
            <p className="text-sm text-green-600 mt-1">
              ✅ This appears to be a 3D file format
            </p>
          )}
          {is2DFile(fileType) && !is3DFile(fileType) && (
            <p className="text-sm text-orange-600 mt-1">
              ⚠️ This appears to be a 2D file format. 3D view may not be available.
            </p>
          )}
        </div>
      )}

      <button 
        onClick={handleUpload} 
        disabled={!file}
        className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        Upload & Convert
      </button>
      
      {progress > 0 && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm mt-2 text-gray-600">Uploading: {progress}%</p>
        </div>
      )}
    </div>
  );
}