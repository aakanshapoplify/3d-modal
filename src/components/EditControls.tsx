"use client";
import { useState, useEffect } from "react";

interface FurnitureModel {
  id: string;
  name: string;
  filename: string;
  path: string;
}

interface EditControlsProps {
  modelColor: string;
  setModelColor: (color: string) => void;
  furnitureColor: string;
  setFurnitureColor: (color: string) => void;
  selectedFurniture: string | null;
  setSelectedFurniture: (id: string | null) => void;
  selectedFurnitureModel: FurnitureModel | null;
  setSelectedFurnitureModel: (model: FurnitureModel | null) => void;
  transformMode: 'none' | 'translate' | 'rotate' | 'scale';
  setTransformMode: (mode: 'none' | 'translate' | 'rotate' | 'scale') => void;
  onDeleteSelectedFurniture: () => void;
  onFurnitureUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onDeleteFurnitureModel: (model: FurnitureModel) => Promise<void>;
}

export default function EditControls({
  modelColor,
  setModelColor,
  furnitureColor,
  setFurnitureColor,
  selectedFurniture,
  setSelectedFurniture,
  selectedFurnitureModel,
  setSelectedFurnitureModel,
  transformMode,
  setTransformMode,
  onDeleteSelectedFurniture,
  onFurnitureUpload,
  onDeleteFurnitureModel
}: EditControlsProps) {
  const [furnitureModels, setFurnitureModels] = useState<FurnitureModel[]>([]);
  const [loadingFurniture, setLoadingFurniture] = useState(false);

  // Load available furniture models
  useEffect(() => {
    const loadFurnitureModels = async () => {
      setLoadingFurniture(true);
      try {
        const response = await fetch('/api/furniture');
        const data = await response.json();
        if (data.furniture) {
          setFurnitureModels(data.furniture);
        }
      } catch (error) {
        console.error('Failed to load furniture models:', error);
      } finally {
        setLoadingFurniture(false);
      }
    };

    loadFurnitureModels();
  }, []);

  const handleModelColorChange = (color: string) => {
    setModelColor(color);
    if (typeof window !== 'undefined' && (window as any).setModelColor) {
      (window as any).setModelColor(color);
    }
  };

  const handleFurnitureColorChange = (color: string) => {
    setFurnitureColor(color);
    if (selectedFurniture && typeof window !== 'undefined' && (window as any).updateFurnitureColor) {
      (window as any).updateFurnitureColor(selectedFurniture, color);
    }
  };

  return (
    <div className="space-y-6">
      {/* Model Color */}
      <div>
        <label className="block text-base font-semibold text-gray-800 mb-3">Model Color</label>
        <div className="flex items-center gap-4">
          <input
            type="color"
            value={modelColor}
            onChange={(e) => handleModelColorChange(e.target.value)}
            className="w-16 h-16 rounded-lg border-3 border-gray-400 cursor-pointer shadow-md"
          />
          <span className="text-sm text-gray-700 font-medium">Change the main model color</span>
        </div>
      </div>

      {/* Furniture Upload */}
      <div>
        <label className="block text-base font-semibold text-gray-800 mb-3">Add New Furniture</label>
        <input
          type="file"
          accept=".glb"
          onChange={onFurnitureUpload}
          className="w-full p-4 border-2 border-dashed border-gray-400 rounded-lg hover:border-blue-500 transition-colors bg-white"
        />
        <p className="text-sm text-gray-600 mt-3 font-medium">
          Upload GLB files to add new furniture models
        </p>
      </div>

      {/* Furniture Selection */}
      <div>
        <label className="block text-base font-semibold text-gray-800 mb-3">
          Select Furniture to Place
          {selectedFurnitureModel && (
            <span className="ml-3 text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">
              ✓ {selectedFurnitureModel.name}
            </span>
          )}
        </label>
        
        {loadingFurniture ? (
          <div className="text-center py-6 text-gray-600 bg-white rounded-lg border">Loading furniture...</div>
        ) : (
          <div className="space-y-3 max-h-48 overflow-y-auto bg-white rounded-lg border p-2">
            {furnitureModels.map((model) => (
              <div key={model.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border hover:border-blue-400 transition-colors">
                <button
                  onClick={() => setSelectedFurnitureModel(model)}
                  className={`flex-1 text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    selectedFurnitureModel?.id === model.id
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-white hover:bg-blue-50 text-gray-700 border'
                  }`}
                >
                  {model.name}
                </button>
                <button
                  onClick={() => onDeleteFurnitureModel(model)}
                  className="ml-3 text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg"
                  title="Delete furniture model"
                >
                  🗑️
                </button>
              </div>
            ))}
            {furnitureModels.length === 0 && (
              <div className="text-center py-8 text-gray-600 text-base">
                <p className="font-medium">No furniture models available</p>
                <p className="text-sm mt-1">Upload some GLB files above</p>
              </div>
            )}
          </div>
        )}
        
        {selectedFurnitureModel && (
          <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <p className="text-base text-blue-800 font-semibold">
              Ready to place: {selectedFurnitureModel.name}
            </p>
            <p className="text-sm text-blue-600 mt-2">
              Click on the floor in the 3D model to place this furniture
            </p>
          </div>
        )}
      </div>

      {/* Transform Controls */}
      {selectedFurniture && (
        <div>
          <label className="block text-base font-semibold text-gray-800 mb-4">Transform Selected Furniture</label>
          <div className="grid grid-cols-4 gap-3 mb-6">
            <button
              onClick={() => setTransformMode('none')}
              className={`p-4 rounded-lg font-semibold transition-colors text-center ${
                transformMode === 'none' 
                  ? 'bg-blue-500 text-white shadow-lg' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-gray-300'
              }`}
            >
              🙈<br />Hide
            </button>
            <button
              onClick={() => setTransformMode('translate')}
              className={`p-4 rounded-lg font-semibold transition-colors text-center ${
                transformMode === 'translate' 
                  ? 'bg-blue-500 text-white shadow-lg' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-gray-300'
              }`}
            >
              📐<br />Move
            </button>
            <button
              onClick={() => setTransformMode('rotate')}
              className={`p-4 rounded-lg font-semibold transition-colors text-center ${
                transformMode === 'rotate' 
                  ? 'bg-blue-500 text-white shadow-lg' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-gray-300'
              }`}
            >
              🔄<br />Rotate
            </button>
            <button
              onClick={() => setTransformMode('scale')}
              className={`p-4 rounded-lg font-semibold transition-colors text-center ${
                transformMode === 'scale' 
                  ? 'bg-blue-500 text-white shadow-lg' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-gray-300'
              }`}
            >
              📏<br />Scale
            </button>
          </div>
          
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-5">
            <p className="text-base text-green-800 font-bold mb-3">
              ✓ Furniture selected - Gizmo is active!
            </p>
            <div className="text-sm text-green-700 space-y-2">
              <p className="font-semibold">How to use:</p>
              <p>• <strong>Move:</strong> Drag colored arrows (Red=X, Green=Y, Blue=Z)</p>
              <p>• <strong>Rotate:</strong> Drag colored circles around the object</p>
              <p>• <strong>Scale:</strong> Drag colored boxes to resize</p>
              <p className="mt-3 text-green-600 font-bold">Snapping: 0.25m / 15° / 0.1x</p>
            </div>
          </div>
        </div>
      )}

      {/* Furniture Color & Actions */}
      {selectedFurniture && (
        <div>
          <label className="block text-base font-semibold text-gray-800 mb-4">Furniture Color</label>
          <div className="flex items-center gap-4 mb-6">
            <input
              type="color"
              value={furnitureColor}
              onChange={(e) => handleFurnitureColorChange(e.target.value)}
              className="w-16 h-16 rounded-lg border-3 border-gray-400 cursor-pointer shadow-md"
            />
            <span className="text-sm text-gray-700 font-medium">Change selected furniture color</span>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onDeleteSelectedFurniture}
              className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold shadow-md"
            >
              🗑️ Delete Selected
            </button>
            <button
              onClick={() => setSelectedFurniture(null)}
              className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold shadow-md"
            >
              ✋ Unselect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
