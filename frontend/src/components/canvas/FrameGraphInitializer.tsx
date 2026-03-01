import { useEffect } from "react";
import { useEditor } from "tldraw";
import { useFrameGraphContext } from "../../contexts/FrameGraphContext";

/**
 * Component that initializes and maintains the frame graph
 * Reconstructs the graph when the editor is ready and handles deletions
 */
export const FrameGraphInitializer = () => {
  const editor = useEditor();
  const frameGraph = useFrameGraphContext();

  useEffect(() => {
    if (!editor) return;

    // Clean up any stale isImproving flags from frames
    // (can happen if page was refreshed during generation)
    const allShapes = editor.getCurrentPageShapes();
    const framesToClean = allShapes.filter(
      (shape) => shape.type === "aspect-frame" && shape.meta?.isImproving === true
    );
    
    if (framesToClean.length > 0) {
      editor.updateShapes(
        framesToClean.map((frame) => ({
          id: frame.id,
          type: "aspect-frame",
          meta: { ...frame.meta, isImproving: false },
        }))
      );
      console.log(`[FrameGraphInitializer] Cleaned up ${framesToClean.length} stale isImproving flags`);
    }

    // Reconstruct graph from existing frames and arrows
    frameGraph.reconstructGraph();

    // Register handler for frame deletions
    const unsubscribe = editor.sideEffects.registerBeforeDeleteHandler(
      "shape",
      (shape) => {
        if (shape.type === "aspect-frame") {
          frameGraph.removeFrameNode(shape.id);
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, [editor, frameGraph]);

  return null;
};
