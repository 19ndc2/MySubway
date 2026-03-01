import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Line, Text } from "react-konva";
import Konva from "konva";

export default function Diagram() {
  const stageRef = useRef<Konva.Stage | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  // State for lines and text boxes
  const [lines, setLines] = useState<Array<{ points: number[]; color: string }>>([]);
  const [texts, setTexts] = useState<Array<{ x: number; y: number; text: string }>>([]);

  // History for undo/redo
  const [history, setHistory] = useState<Array<{ lines: typeof lines; texts: typeof texts }>>([{ lines: [], texts: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);

  // Tool and color
  const [tool, setTool] = useState<"pen" | "eraser" | "select">("pen");
  const [currentColor, setCurrentColor] = useState("blue");

  // Default swatches (editable)
  const [swatches, setSwatches] = useState<string[]>(["blue", "red", "green", "orange"]);

  // Text editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // Handle window resize
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

  // Add to history when lines or texts change
  useEffect(() => {
    if (isDrawing) return; // Don't add to history while drawing
    
    const lastHistoryState = history[historyIndex];
    // Only add to history if the state actually changed
    if (JSON.stringify(lastHistoryState.lines) === JSON.stringify(lines) && 
        JSON.stringify(lastHistoryState.texts) === JSON.stringify(texts)) {
      return;
    }
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ lines, texts });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [lines, texts, isDrawing]);

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setLines(history[newIndex].lines);
      setTexts(history[newIndex].texts);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setLines(history[newIndex].lines);
      setTexts(history[newIndex].texts);
    }
  };

  const handleMouseDown = (e: any) => {
    if (tool === "select") return; // Don't draw in select mode
    setIsDrawing(true);
    const pos = e.target.getStage()?.getPointerPosition();
    if (pos) {
      setLines([...lines, { points: [pos.x, pos.y], color: tool === "pen" ? currentColor : "white" }]);
    }
  };

  const handleDoubleClick = (e: any) => {
    if (tool !== "select") return; // Only in select mode
    
    const clickedShape = e.target;
    
    // Check if double-clicking on existing text
    if (clickedShape.getClassName && clickedShape.getClassName() === "Text") {
      const textIndex = texts.findIndex(txt => {
        const x = clickedShape.x();
        const y = clickedShape.y();
        return Math.abs(x - txt.x) < 5 && Math.abs(y - txt.y) < 5;
      });
      if (textIndex !== -1) {
        setEditingIndex(textIndex);
        setEditingValue(texts[textIndex].text);
      }
    } else {
      // Double-clicking on empty canvas - create new blank text box
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const newTextIndex = texts.length;
        setTexts([...texts, { x: pos.x, y: pos.y, text: "" }]);
        setEditingIndex(newTextIndex);
        setEditingValue("");
      }
    }
  };

  const finishEditing = () => {
    if (editingIndex !== null) {
      const newTexts = [...texts];
      if (editingValue.trim()) {
        newTexts[editingIndex].text = editingValue;
      } else {
        // Remove empty text boxes
        newTexts.splice(editingIndex, 1);
      }
      setTexts(newTexts);
    }
    setEditingIndex(null);
    setEditingValue("");
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

  const downloadPNG = () => {
    const dataURL = stageRef.current?.toDataURL({ pixelRatio: 3 });
    if (!dataURL) return;

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "diagram.png";
    link.click();
  };

  const clearCanvas = () => {
    setLines([]);
    setTexts([]);
  };

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: "10px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={downloadPNG}>Export PNG</button>
        <button onClick={clearCanvas} style={{ backgroundColor: "#ffcccc" }}>
          Clear
        </button>

        {/* Undo/Redo buttons */}
        <button onClick={undo} disabled={historyIndex === 0}>
          ↶ Undo
        </button>
        <button onClick={redo} disabled={historyIndex === history.length - 1}>
          ↷ Redo
        </button>

        {/* Tool selector */}
        <button onClick={() => setTool("pen")} style={{ backgroundColor: tool === "pen" ? "#ddd" : "white" }}>
          Pen
        </button>
        <button onClick={() => setTool("eraser")} style={{ backgroundColor: tool === "eraser" ? "#ddd" : "white" }}>
          Eraser
        </button>
        <button onClick={() => setTool("select")} style={{ backgroundColor: tool === "select" ? "#ddd" : "white" }}>
          Move/Edit Text
        </button>

        {/* Color swatches */}
        {swatches.map((color, index) => (
          <div key={index} style={{ display: "flex", alignItems: "center", gap: "5px", position: "relative" }}>
            <div
              onClick={() => setCurrentColor(color)}
              style={{
                width: "24px",
                height: "24px",
                backgroundColor: color,
                border: currentColor === color ? "2px solid black" : "1px solid #ccc",
                cursor: "pointer",
              }}
            />
            {/* Dropdown arrow label */}
            <label style={{ cursor: "pointer", userSelect: "none" }}>
              ▼
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  const newSwatches = [...swatches];
                  newSwatches[index] = e.target.value;
                  setSwatches(newSwatches);
                  if (currentColor === color) setCurrentColor(e.target.value);
                }}
                style={{ display: "none" }}
              />
            </label>
          </div>
        ))}
      </div>

      <Stage
        width={stageSize.width}
        height={stageSize.height - 50}
        ref={stageRef}
        onMouseDown={handleMouseDown}
        onMousemove={handleMouseMove}
        onMouseup={handleMouseUp}
        onDblClick={handleDoubleClick}
        style={{ border: "1px solid black", flex: 1 }}
      >
        <Layer>
          {lines.map((line, i) => (
            <Line
              key={i}
              points={line.points}
              stroke={line.color}
              strokeWidth={tool === "eraser" ? 20 : 4}
              tension={0.5}
              lineCap="round"
            />
          ))}

          {texts.map((txt, i) => (
            <Text
              key={i}
              x={txt.x}
              y={txt.y}
              text={txt.text}
              fontSize={18}
              fill="black"
              draggable={tool === "select" && editingIndex !== i}
              onDragEnd={(e) => {
                const newTexts = [...texts];
                newTexts[i] = { ...newTexts[i], x: e.target.x(), y: e.target.y() };
                setTexts(newTexts);
              }}
            />
          ))}
        </Layer>
      </Stage>

      {/* Text editing input */}
      {editingIndex !== null && (
        <input
          type="text"
          autoFocus
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={finishEditing}
          onKeyDown={(e) => {
            if (e.key === "Enter") finishEditing();
            if (e.key === "Escape") {
              setEditingIndex(null);
              setEditingValue("");
            }
          }}
          style={{
            position: "absolute",
            left: `${texts[editingIndex].x}px`,
            top: `${texts[editingIndex].y + 50}px`,
            padding: "5px",
            fontSize: "16px",
            border: "2px solid blue",
            zIndex: 1000,
          }}
        />
      )}
    </div>
  );
}