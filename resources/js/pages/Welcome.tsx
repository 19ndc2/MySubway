import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Line, Text, Image as KonvaImage, Rect } from "react-konva";
import Konva from "konva";

export default function Diagram() {
  const stageRef = useRef<Konva.Stage | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  // Canvas state
  const [lines, setLines] = useState<Array<{ points: number[]; color: string }>>([]);
  const [texts, setTexts] = useState<Array<{ x: number; y: number; text: string }>>([]);
  const [images, setImages] = useState<Array<{ id: string; src: string; x: number; y: number; width: number; height: number }>>([]);

  // Undo/Redo history
  const [history, setHistory] = useState<Array<{ lines: Array<{ points: number[]; color: string }>; texts: Array<{ x: number; y: number; text: string }>; images: Array<{ id: string; src: string; x: number; y: number; width: number; height: number }> }>>([{ lines: [], texts: [], images: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<"pen" | "eraser" | "select">("pen");
  const [currentColor, setCurrentColor] = useState("blue");
  const [swatches, setSwatches] = useState(["blue", "red", "green", "black"]);

  // Text editing
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // Color picker dropdown
  const [openColorPicker, setOpenColorPicker] = useState<number | null>(null);

  // Image selection/resizing
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [resizingImageId, setResizingImageId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Backend conversion state
  const [convertedImage, setConvertedImage] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);

  // Resize stage on window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Clear selection if not in select mode
  useEffect(() => {
    if (tool !== "select") setSelectedImageId(null);
  }, [tool]);

  // Track history
  useEffect(() => {
    if (isDrawing) return;
    const last = history[historyIndex];
    if (
      JSON.stringify(last.lines) === JSON.stringify(lines) &&
      JSON.stringify(last.texts) === JSON.stringify(texts) &&
      JSON.stringify(last.images) === JSON.stringify(images)
    ) return;

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ lines, texts, images });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [lines, texts, images, isDrawing]);

  // Undo / Redo
  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setLines(history[newIndex].lines);
      setTexts(history[newIndex].texts);
      setImages(history[newIndex].images);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setLines(history[newIndex].lines);
      setTexts(history[newIndex].texts);
      setImages(history[newIndex].images);
    }
  };

  // Mouse events
  const handleMouseDown = (e: any) => {
    if (tool === "select") {
      if (e.target === e.target.getStage()) setSelectedImageId(null);
      return;
    }
    setIsDrawing(true);
    const pos = e.target.getStage()?.getPointerPosition();
    if (pos) {
      setLines([...lines, { points: [pos.x, pos.y], color: tool === "pen" ? currentColor : "white" }]);
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || tool === "select") return;
    const stage = e.target.getStage();
    const point = stage?.getPointerPosition();
    if (!point) return;

    const lastLine = lines[lines.length - 1];
    lastLine.points = lastLine.points.concat([point.x, point.y]);
    const newLines = lines.slice(0, lines.length - 1).concat(lastLine);
    setLines(newLines);
  };

  const handleMouseUp = () => setIsDrawing(false);

  // Double-click for text
  const handleDoubleClick = (e: any) => {
    if (tool !== "select") return;
    const clickedShape = e.target;
    if (clickedShape.getClassName && clickedShape.getClassName() === "Text") {
      const textIndex = texts.findIndex((txt) => Math.abs(txt.x - clickedShape.x()) < 5 && Math.abs(txt.y - clickedShape.y()) < 5);
      if (textIndex !== -1) {
        setEditingIndex(textIndex);
        setEditingValue(texts[textIndex].text);
      }
    } else {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const newIndex = texts.length;
        setTexts([...texts, { x: pos.x, y: pos.y, text: "" }]);
        setEditingIndex(newIndex);
        setEditingValue("");
      }
    }
  };

  const finishEditing = () => {
    if (editingIndex !== null) {
      const newTexts = [...texts];
      if (editingValue.trim()) newTexts[editingIndex].text = editingValue;
      else newTexts.splice(editingIndex, 1);
      setTexts(newTexts);
    }
    setEditingIndex(null);
    setEditingValue("");
  };

  const clearCanvas = () => {
    setLines([]);
    setTexts([]);
    setImages([]);
  };

  const handleImportImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const imgObj = new window.Image();
      imgObj.onload = () => {
        const maxWidth = 200, maxHeight = 200;
        let width = imgObj.naturalWidth;
        let height = imgObj.naturalHeight;
        const ratio = width / height;
        if (width > maxWidth || height > maxHeight) {
          if (ratio > 1) { width = maxWidth; height = maxWidth / ratio; }
          else { height = maxHeight; width = maxHeight * ratio; }
        }
        setImages([...images, { id: `${Date.now()}`, src, x: stageSize.width / 4, y: stageSize.height / 4, width, height }]);
      };
      imgObj.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Download frontend PNG
  const downloadPNG = () => {
    const dataURL = stageRef.current?.toDataURL({ pixelRatio: 3 });
    if (!dataURL) return;
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "diagram.png";
    link.click();
  };

  // Backend call
  const handleMakeDiagram = async () => {
    setIsConverting(true);
    setConversionError(null);
    try {
      const dataURL = stageRef.current?.toDataURL({ pixelRatio: 3 });
      if (!dataURL) { setConversionError("Failed to generate canvas image"); setIsConverting(false); return; }

      const blob = await (await fetch(dataURL)).blob();
      const formData = new FormData();
      formData.append("image", blob, "diagram.png");

      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 120000);

      const apiResponse = await fetch("/api/convert-image", { method: "POST", body: formData, signal: abortController.signal });
      clearTimeout(timeoutId);

      if (!apiResponse.ok) {
        setConversionError(`API Error: ${apiResponse.statusText}`);
        setIsConverting(false);
        return;
      }

      const convertedBlob = await apiResponse.blob();
      const reader = new FileReader();
      reader.onload = () => { setConvertedImage(reader.result as string); setIsConverting(false); };
      reader.onerror = () => { setConversionError("Failed to read converted image"); setIsConverting(false); };
      reader.readAsDataURL(convertedBlob);

    } catch (error) {
      setConversionError(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsConverting(false);
    }
  };

  const handleSaveConverted = () => {
    if (!convertedImage) return;
    const link = document.createElement("a");
    link.href = convertedImage;
    link.download = "converted-diagram.png";
    link.click();
  };

  /** --- BUTTON STYLE --- */
  const buttonStyle: React.CSSProperties = {
    padding: "8px 16px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    transition: "all 0.15s ease",
  };

  const primaryButton: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: "#4F46E5",
    color: "white",
  };

  const secondaryButton: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: "#F3F4F6",
    color: "#111827",
  };

  const activeToolButton: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: "#E0E7FF",
    color: "#4F46E5",
  };

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", fontFamily: "sans-serif" }}>
      {/* Toolbar */}
      <div style={{ marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 0, alignItems: "center" }}>
        {/* Logo */}
        <img src="/MySubwayLogo.png" alt="My Subway Logo" style={{ height: 32, marginRight: 20 }} />

        {/* Group 1: Make Diagram & Import Image */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", paddingRight: 20 }}>
          <button onClick={handleMakeDiagram} disabled={isConverting || (!lines.length && !texts.length && !images.length)} style={{ ...primaryButton, opacity: isConverting ? 0.6 : 1 }}>
            {isConverting ? "Converting..." : "Make Diagram"}
          </button>
          <label>
            <input type="file" accept="image/*" onChange={handleImportImage} style={{ display: "none" }} />
            <span style={{ ...secondaryButton, display: "inline-block" }}>Import Image</span>
          </label>
        </div>

        <div style={{ width: 1, height: 24, backgroundColor: "#E5E7EB", marginRight: 20 }} />

        {/* Group 2: Clear, Undo, Redo */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", paddingRight: 20 }}>
          <button onClick={clearCanvas} style={{ ...secondaryButton, backgroundColor: "#FEE2E2", color: "#B91C1C" }}>Clear</button>
          <button onClick={undo} disabled={historyIndex === 0} style={secondaryButton}>↶ Undo</button>
          <button onClick={redo} disabled={historyIndex === history.length - 1} style={secondaryButton}>↷ Redo</button>
        </div>

        <div style={{ width: 1, height: 24, backgroundColor: "#E5E7EB", marginRight: 20 }} />

        {/* Group 3: Pen, Eraser, Text */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", paddingRight: 20 }}>
          <button onClick={() => setTool("pen")} style={tool === "pen" ? activeToolButton : secondaryButton}>Pen</button>
          <button onClick={() => setTool("eraser")} style={tool === "eraser" ? activeToolButton : secondaryButton}>Eraser</button>
          <button onClick={() => setTool("select")} style={tool === "select" ? activeToolButton : secondaryButton}>Text</button>
        </div>

        <div style={{ width: 1, height: 24, backgroundColor: "#E5E7EB", marginRight: 20 }} />

        {/* Group 4: Colour Selectors */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {swatches.map((color, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 0, position: "relative" }}>
              <div onClick={() => setCurrentColor(color)} style={{
                width: 24,
                height: 24,
                backgroundColor: color,
                borderRadius: "50%",
                border: currentColor === color ? "2px solid black" : "1px solid #ccc",
                cursor: "pointer",
              }} />
              <button onClick={() => setOpenColorPicker(openColorPicker === i ? null : i)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, padding: "0 2px", marginLeft: -2 }}>▼</button>
              {openColorPicker === i && (
                <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 1000 }}>
                  <input type="color" value={color} autoFocus onChange={(e) => {
                    const newSwatches = [...swatches];
                    newSwatches[i] = e.target.value;
                    setSwatches(newSwatches);
                    if (currentColor === color) setCurrentColor(e.target.value);
                  }} onBlur={() => setOpenColorPicker(null)} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stage */}
      <Stage width={stageSize.width} height={stageSize.height - 50} ref={stageRef}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onDblClick={handleDoubleClick}
        style={{ border: "1px solid black", flex: 1 }}
      >
        <Layer>
          {images.map(img => (
            <React.Fragment key={img.id}>
              <KonvaImage
                x={img.x} y={img.y} width={img.width} height={img.height} draggable={tool === "select"}
                image={(() => { const i = new window.Image(); i.src = img.src; return i; })()}
                onClick={() => { if (tool === "select") setSelectedImageId(img.id); }}
                onDragEnd={(e) => { const newImages = images.map(i => i.id === img.id ? { ...i, x: e.target.x(), y: e.target.y() } : i); setImages(newImages); }}
              />
              {tool === "select" && selectedImageId === img.id && (
                <>
                  <Rect x={img.x} y={img.y} width={img.width} height={img.height} stroke="blue" strokeWidth={2} fill="transparent" pointerEvents="none" />
                  <Rect x={img.x + img.width - 8} y={img.y + img.height - 8} width={16} height={16} fill="blue" draggable
                    onMouseDown={() => setResizingImageId(img.id)}
                    onDragMove={(e) => {
                      if (resizingImageId === img.id && resizeStart) {
                        const w = Math.max(50, e.target.x() - resizeStart.x + 8);
                        const h = Math.max(50, e.target.y() - resizeStart.y + 8);
                        setImages(images.map(i => i.id === img.id ? { ...i, width: w, height: h } : i));
                      }
                    }}
                    onDragEnd={() => { setResizingImageId(null); setResizeStart(null); }}
                  />
                </>
              )}
            </React.Fragment>
          ))}

          {lines.map((line, i) => <Line key={i} points={line.points} stroke={line.color} strokeWidth={tool === "eraser" ? 20 : 4} tension={0.5} lineCap="round" />)}
          {texts.map((txt, i) => <Text key={i} x={txt.x} y={txt.y} text={txt.text} fontSize={18} fill="black" draggable={tool === "select" && editingIndex !== i} onDragEnd={(e) => { const newTexts = [...texts]; newTexts[i] = { ...newTexts[i], x: e.target.x(), y: e.target.y() }; setTexts(newTexts); }} />)}
        </Layer>
      </Stage>

      {editingIndex !== null && <input type="text" autoFocus value={editingValue} onChange={e => setEditingValue(e.target.value)} onBlur={finishEditing}
        onKeyDown={e => { if (e.key === "Enter") finishEditing(); if (e.key === "Escape") { setEditingIndex(null); setEditingValue(""); } }}
        style={{ position: "absolute", left: texts[editingIndex].x, top: texts[editingIndex].y + 50, zIndex: 1000, padding: "4px 8px", borderRadius: 4, border: "1px solid #ccc" }}
      />}

      {conversionError && <div style={{ color: "red", marginTop: 10 }}><strong>Error:</strong> {conversionError}</div>}
      {convertedImage && <div style={{ marginTop: 10 }}>
        <img src={convertedImage} alt="Converted" style={{ maxWidth: "100%" }} />
        <button onClick={handleSaveConverted} style={{ ...primaryButton, marginTop: 8 }}>Save Converted</button>
      </div>}
    </div>
  );
}