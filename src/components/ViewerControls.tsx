"use client";
import { useCallback, useState } from "react";
import { MAX_TOUR_SPEED_RPM, SPEED_PRESETS_RPM } from "./viewer/constants";

interface ViewerControlsProps {
  firstPerson: boolean;
  setFirstPerson: (v: boolean) => void;
  walkFloorIdx: number;
  setWalkFloorIdx: (v: number | ((p: number) => number)) => void;
  floors: number[];
  tourMode: "none" | "exterior" | "interior" | "full";
  tourPlaying: boolean;
  onStartExterior: () => void;
  onStartInterior: (floor: number) => void;
  onStartFull: () => void;
  onStop: () => void;
  interiorFloorIdx: number;
  setInteriorFloorIdx: (v: number) => void;
  cycleFloors: boolean;
  setCycleFloors: (v: boolean) => void;
  tourSpeed: number;
  setTourSpeed: (v: number) => void;
  pointerLocked: boolean;
}

export default function ViewerControls(props: ViewerControlsProps) {
  const {
    firstPerson,
    setFirstPerson,
    walkFloorIdx,
    setWalkFloorIdx,
    floors,
    tourMode,
    tourPlaying,
    onStartExterior,
    onStartInterior,
    onStartFull,
    onStop,
    interiorFloorIdx,
    setInteriorFloorIdx,
    cycleFloors,
    setCycleFloors,
    tourSpeed,
    setTourSpeed,
    pointerLocked,
  } = props;

  const [panelOpen, setPanelOpen] = useState(true);

  const togglePointerLock = useCallback(() => {
    const canvas = document.getElementById("r3f-canvas");
    if (!canvas) return;
    if (pointerLocked) {
      document.exitPointerLock?.();
    } else {
      canvas.requestPointerLock?.();
    }
  }, [pointerLocked]);

  return (
    <div className="absolute top-3 left-3 z-20 flex gap-2 items-start pointer-events-none">
      <div className="pointer-events-auto select-none">
        <button
          onClick={() => setPanelOpen((o) => !o)}
          className="mb-2 px-3 py-1 rounded bg-gray-900 text-white text-xs shadow"
          aria-expanded={panelOpen}
        >
          {panelOpen ? "Hide Controls" : "Show Controls"}
        </button>
        {panelOpen && (
          <div className="w-80 max-w-[320px] bg-white/95 backdrop-blur rounded-lg border shadow p-3 space-y-4 text-[11px] leading-tight">
            <section className="space-y-2">
              <h3 className="font-semibold text-xs text-gray-800 flex items-center gap-2">
                Camera & Walk
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={firstPerson}
                    onChange={(e) => setFirstPerson(e.target.checked)}
                  />
                  <span>First Person</span>
                </label>
                <button
                  onClick={togglePointerLock}
                  className={`px-2 py-1 rounded text-xs border ${
                    pointerLocked ? "bg-indigo-600 text-white" : "bg-white"
                  }`}
                  aria-pressed={pointerLocked}
                >
                  {pointerLocked ? "Unlock Pointer" : "Lock Pointer"}
                </button>
              </div>
              {firstPerson && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setWalkFloorIdx((i) => Math.max(i - 1, 0))}
                      className="px-2 py-1 rounded bg-gray-100 border"
                    >
                      Floor -
                    </button>
                    <button
                      onClick={() =>
                        setWalkFloorIdx((i) =>
                          Math.min(i + 1, floors.length - 1)
                        )
                      }
                      className="px-2 py-1 rounded bg-gray-100 border"
                    >
                      Floor +
                    </button>
                    <button
                      onClick={() => setWalkFloorIdx(0)}
                      className="px-2 py-1 rounded bg-gray-900 text-white"
                    >
                      Ground
                    </button>
                  </div>
                  <div className="text-gray-600">
                    Walk Floor: {walkFloorIdx} (y={floors[walkFloorIdx]})
                  </div>
                </div>
              )}
            </section>
            <section className="space-y-2">
              <h3 className="font-semibold text-xs text-gray-800 flex items-center gap-2">
                Tours
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={onStartExterior}
                  disabled={tourMode === "exterior" && tourPlaying}
                  className="px-2 py-1 rounded bg-blue-50 border text-blue-700 disabled:opacity-40"
                >
                  Exterior
                </button>
                <button
                  onClick={() => onStartInterior(interiorFloorIdx)}
                  disabled={tourMode === "interior" && tourPlaying}
                  className="px-2 py-1 rounded bg-green-50 border text-green-700 disabled:opacity-40"
                >
                  Interior Floor
                </button>
                <button
                  onClick={onStartFull}
                  disabled={tourMode === "full" && tourPlaying}
                  className="px-2 py-1 rounded bg-purple-50 border text-purple-700 disabled:opacity-40"
                >
                  Full Tour
                </button>
                <button
                  onClick={onStop}
                  disabled={!tourPlaying}
                  className="px-2 py-1 rounded bg-red-600 text-white disabled:opacity-40"
                >
                  Stop
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="flex items-center gap-1">
                  <span>Interior Floor:</span>
                  <select
                    value={interiorFloorIdx}
                    onChange={(e) =>
                      setInteriorFloorIdx(parseInt(e.target.value))
                    }
                    className="border rounded px-1 py-0.5 text-xs"
                  >
                    {floors.map((_, i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={cycleFloors}
                    onChange={(e) => setCycleFloors(e.target.checked)}
                    disabled={tourMode !== "interior"}
                  />
                  <span>Cycle Floors</span>
                </label>
              </div>
              <div className="space-y-2">
                <label className="flex flex-col gap-1">
                  <span className="flex justify-between items-center">
                    <span>Tour Speed (rpm)</span>
                    <span className="text-gray-500 tabular-nums">
                      {tourSpeed.toFixed(2)}
                    </span>
                  </span>
                  <input
                    aria-label="Tour speed"
                    type="range"
                    min={0.05}
                    max={MAX_TOUR_SPEED_RPM}
                    step={0.05}
                    value={tourSpeed}
                    onChange={(e) =>
                      setTourSpeed(
                        Math.min(
                          MAX_TOUR_SPEED_RPM,
                          Math.max(0.05, parseFloat(e.target.value))
                        )
                      )
                    }
                  />
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="number"
                    step={0.05}
                    min={0.05}
                    max={MAX_TOUR_SPEED_RPM}
                    value={tourSpeed}
                    onChange={(e) =>
                      setTourSpeed(
                        Math.min(
                          MAX_TOUR_SPEED_RPM,
                          Math.max(0.05, parseFloat(e.target.value) || 0.05)
                        )
                      )
                    }
                    className="w-20 px-1 py-0.5 border rounded text-xs"
                  />
                  <div className="flex gap-1 flex-wrap">
                    {SPEED_PRESETS_RPM.map((rpm) => (
                      <button
                        key={rpm}
                        type="button"
                        onClick={() => setTourSpeed(rpm)}
                        className={`px-2 py-1 rounded border text-xs ${
                          Math.abs(tourSpeed - rpm) < 0.001
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white hover:bg-indigo-50"
                        }`}
                        title={`${(60 / rpm).toFixed(1)}s / revolution`}
                      >
                        {rpm}x
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 leading-snug">
                  Higher values spin faster. 1 rpm = 60s per full exterior
                  revolution. Presets: Slow→Extreme.
                </p>
              </div>
              <div className="text-gray-600 text-[10px]">
                Mode: {tourMode} {tourPlaying ? "(playing)" : "(idle)"}
              </div>
            </section>
            <section className="space-y-1">
              <h3 className="font-semibold text-xs text-gray-800">Help</h3>
              <p className="text-gray-600">
                WASD to move (first person). PageUp/PageDown or buttons change
                walk floor. In tours, camera animates automatically.
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
