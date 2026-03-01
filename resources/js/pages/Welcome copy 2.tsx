import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Line, Text, Image as KonvaImage, Rect } from "react-konva";
import Konva from "konva";

type LineType = { points: number[]; color: string };
type TextType = { x: number; y: number; text: string };
type ImageType = {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export default function Diagram() {
  const stageRef = useRef<Konva.Stage | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  const [lines, setLines] = useState<LineType[]>([]);
  const [texts, setTexts] = useState<TextType[]>([]);
  const [images, setImages] = useState<ImageType[]>([]);
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});

  const [tool, setTool] = useState<"pen" | "eraser" | "select">("pen");
  const [currentColor, setCurrentColor] = useState("blue");
  const [swatches, setSwatches] = useState(["blue", "red", "green", "orange"]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  /* ---------------- Resize ---------------- */
  useEffect(() => {
    const resize = () => {
      if (!containerRef.current) return;
      setStageSize({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  /* ---------------- Image preload ---------------- */
  useEffect(() => {
    images.forEach((img) => {
      if (!loadedImages[img.id]) {
        const image = new window.Image();
        image.src = img.src;
        image.onload = () => {
          setLoadedImages((prev) => ({ ...prev, [img.id]: image }));
        };
      }
    });
  }, [images, loadedImages]);

  /* ---------------- Drawing ---------------- */
  const handleMouseDown = (e: any) => {
    if (tool === "select") {
      if (e.target === e.target.getStage()) setSelectedImageId(null);
      return;
    }
    setIsDrawing(true);
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    setLines([...lines, { points: [pos.x, pos.y], color: tool === "pen" ? currentColor : "white" }]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || tool === "select") return;
    const stage = e.target.getStage();
    const point = stage?.getPointerPosition();
    if (!point) return;

    const last = lines[lines.length - 1];
    last.points = last.points.concat([point.x, point.y]);
    setLines(lines.slice(0, -1).concat(last));
  };

  const handleMouseUp = () => setIsDrawing(false);

  /* ---------------- Text ---------------- */
  const handleDoubleClick = (e: any) => {
    if (tool !== "select") return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    setTexts([...texts, { x: pos.x, y: pos.y, text: "" }]);
    setEditingIndex(texts.length);
    setEditingValue("");
  };

  const finishEditing = () => {
    if (editingIndex === null) return;
    const next = [...texts];
    if (editingValue.trim()) next[editingIndex].text = editingValue;
    else next.splice(editingIndex, 1);
    setTexts(next);
    setEditingIndex(null);
    setEditingValue("");
  };

  /* ---------------- Import Image ---------------- */
  const handleImportImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(200 / img.width, 200 / img.height, 1);
        setImages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            src,
            x: stageSize.width / 4,
            y: stageSize.height / 4,
            width: img.width * scale,
            height: img.height * scale,
          },
        ]);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, padding: 8, flexWrap: "wrap" }}>
        <label>
          <input type="file" accept="image/*" onChange={handleImportImage} hidden />
          <button>Import Image</button>
        </label>

        <button onClick={() => setTool("pen")} style={{ background: tool === "pen" ? "#ddd" : "" }}>Pen</button>
        <button onClick={() => setTool("eraser")} style={{ background: tool === "eraser" ? "#ddd" : "" }}>Eraser</button>
        <button onClick={() => setTool("select")} style={{ background: tool === "select" ? "#ddd" : "" }}>Select</button>

        {swatches.map((c, i) => (
          <div key={i} style={{ display: "flex", gap: 4 }}>
            <div
              onClick={() => setCurrentColor(c)}
              style={{
                width: 20,
                height: 20,
                background: c,
                border: currentColor === c ? "2px solid black" : "1px solid #ccc",
                cursor: "pointer",
              }}
            />
            <input
              type="color"
              value={c}
              onChange={(e) => {
                const next = [...swatches];
                next[i] = e.target.value;
                setSwatches(next);
              }}
            />
          </div>
        ))}
      </div>

      {/* Canvas */}
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height - 60}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDblClick={handleDoubleClick}
        style={{ border: "1px solid black" }}
      >
        <Layer>
          {/* Images */}
          {images.map(
            (img) =>
              loadedImages[img.id] && (
                <React.Fragment key={img.id}>
                  <KonvaImage
                    image={loadedImages[img.id]}
                    x={img.x}
                    y={img.y}
                    width={img.width}
                    height={img.height}
                    draggable={tool === "select"}
                    onClick={() => setSelectedImageId(img.id)}
                    onDragEnd={(e) => {
                      setImages((prev) =>
                        prev.map((i) =>
                          i.id === img.id ? { ...i, x: e.target.x(), y: e.target.y() } : i
                        )
                      );
                    }}
                  />
                  {selectedImageId === img.id && (
                    <Rect
                      x={img.x}
                      y={img.y}
                      width={img.width}
                      height={img.height}
                      stroke="blue"
                      dash={[4, 4]}
                    />
                  )}
                </React.Fragment>
              )
          )}

          {/* Lines */}
          {lines.map((l, i) => (
            <Line key={i} points={l.points} stroke={l.color} strokeWidth={4} lineCap="round" />
          ))}

          {/* Text */}
          {texts.map((t, i) => (
            <Text
              key={i}
              x={t.x}
              y={t.y}
              text={t.text}
              draggable={tool === "select"}
              onDblClick={() => {
                setEditingIndex(i);
                setEditingValue(t.text);
              }}
            />
          ))}
        </Layer>
      </Stage>

      {editingIndex !== null && (
        <input
          autoFocus
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={finishEditing}
          onKeyDown={(e) => e.key === "Enter" && finishEditing()}
          style={{
            position: "absolute",
            left: texts[editingIndex].x,
            top: texts[editingIndex].y + 40,
          }}
        />
      )}
    </div>
  );
}