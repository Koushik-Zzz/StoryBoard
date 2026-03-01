import React, { useState } from "react";
import { Editor, TLShapeId } from "tldraw";
import { toast } from "sonner";
import { Button, Flex, Tooltip } from "@radix-ui/themes";
import { Eraser, Video, Loader2 } from "lucide-react";
import { apiFetch } from "../../utils/api";

interface CanvasToolbarProps {
  onClear: () => void;
  editorRef: React.RefObject<Editor | null>;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  onClear,
  editorRef,
}) => {
  const [isMerging, setIsMerging] = useState(false);

  /**
   * Find the path of arrows from root to the selected frame
   * by tracing back through arrow bindings
   */
  const findArrowPathToFrame = (editor: Editor, targetFrameId: TLShapeId): TLShapeId[] => {
    const arrowPath: TLShapeId[] = [];
    let currentFrameId: TLShapeId | null = targetFrameId;
    const visited = new Set<string>();

    // Trace backwards from target frame to root
    while (currentFrameId && !visited.has(currentFrameId)) {
      visited.add(currentFrameId);
      
      // Find arrow that ends at this frame
      const arrows = editor.getCurrentPageShapes().filter(s => s.type === "arrow");
      let foundArrow = false;
      
      for (const arrow of arrows) {
        const bindings = editor.getBindingsInvolvingShape(arrow.id);
        const endBinding = bindings.find(
          (b: any) => b.fromId === arrow.id && b.props.terminal === "end"
        );
        
        if (endBinding && (endBinding as any).toId === currentFrameId) {
          // Found an arrow pointing to this frame
          arrowPath.unshift(arrow.id);
          
          // Find where this arrow starts from
          const startBinding = bindings.find(
            (b: any) => b.fromId === arrow.id && b.props.terminal === "start"
          );
          
          if (startBinding) {
            currentFrameId = (startBinding as any).toId;
            foundArrow = true;
            break;
          }
        }
      }
      
      if (!foundArrow) {
        // No more arrows pointing to this frame - we've reached the root
        break;
      }
    }

    return arrowPath;
  };

  const handleMergeVideos = async () => {
    if (!editorRef.current) {
      toast.error("Editor not ready. Please wait a moment and try again.");
      return;
    }

    const editor = editorRef.current;

    // Get selected shapes
    const selectedIds = editor.getSelectedShapeIds();

    // Find the selected frame
    const selectedFrame = selectedIds
      .map((id) => editor.getShape(id))
      .find((shape) => shape?.type === "aspect-frame");

    if (!selectedFrame) {
      toast.error("Please select a frame to merge videos from.");
      return;
    }

    // Find all arrows in the path from root to selected frame
    const arrowPath = findArrowPathToFrame(editor, selectedFrame.id);
    
    console.log("[Merge] Found arrow path:", arrowPath);

    if (arrowPath.length === 0) {
      toast.error("No arrows found leading to this frame. Is this a root frame?");
      return;
    }

    // Collect video URLs from arrows in the path
    const videoUrls: string[] = [];
    let arrowsWithoutVideo = 0;

    for (const arrowId of arrowPath) {
      const arrow = editor.getShape(arrowId);
      if (arrow && arrow.type === "arrow") {
        const videoUrl = arrow.meta?.videoUrl as string | undefined;
        const status = arrow.meta?.status as string | undefined;
        console.log(`[Merge] Arrow ${arrowId}: status=${status}, hasUrl=${!!videoUrl}`);
        
        if (videoUrl && status === "done") {
          videoUrls.push(videoUrl);
        } else {
          arrowsWithoutVideo++;
        }
      }
    }

    if (videoUrls.length === 0) {
      if (arrowsWithoutVideo > 0) {
        toast.error(`Found ${arrowsWithoutVideo} arrow(s) but none have completed videos. Generate videos first!`);
      } else {
        toast.error("No arrows found in the path.");
      }
      return;
    }

    if (videoUrls.length < 2) {
      if (arrowsWithoutVideo > 0) {
        toast.error(`Only ${videoUrls.length} video ready. ${arrowsWithoutVideo} arrow(s) still need videos generated.`);
      } else {
        toast.error(`Only ${videoUrls.length} video in path. Select a frame further down the chain (need 2+ arrows with videos).`);
      }
      return;
    }

    // Call backend API to merge videos
    setIsMerging(true);
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    try {
      const response = await apiFetch(`${backendUrl}/api/jobs/video/merge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ video_urls: videoUrls }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`,
        );
      }

      const result = await response.json();
      const mergedVideoUrl = result.video_url;

      if (!mergedVideoUrl) {
        throw new Error("No video URL returned from server");
      }

      toast.success(`Successfully merged ${videoUrls.length} videos!`);

      // Download the merged video
      try {
        const videoResponse = await fetch(mergedVideoUrl);
        const videoBlob = await videoResponse.blob();
        const url = window.URL.createObjectURL(videoBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `merged-video-${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success("Video downloaded successfully!");
      } catch (downloadError) {
        console.error("Error downloading video:", downloadError);
        toast.error(
          "Video merged but download failed. You can access it at the URL in the console.",
        );
      }
    } catch (error) {
      console.error("Error merging videos:", error);
      toast.error(
        `Failed to merge videos: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50">
      <Flex
        gap="3"
        p="2"
        style={{
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(12px)",
          border: "2px solid rgba(167, 139, 250, 0.4)",
          boxShadow: "0 8px 32px rgba(167, 139, 250, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.8) inset",
          borderRadius: "20px",
        }}
      >
        <Tooltip content="Clear Canvas">
          <Button
            variant="surface"
            color="red"
            onClick={onClear}
            style={{
              cursor: "pointer",
              background: "linear-gradient(135deg, rgba(254, 202, 202, 0.6), rgba(252, 165, 165, 0.6))",
              border: "2px solid rgba(248, 113, 113, 0.3)",
              borderRadius: "12px",
              fontWeight: 600,
            }}
            className="hover:scale-105 transition-all"
          >
            <Eraser size={16} />
            Clear
          </Button>
        </Tooltip>

        <Tooltip content="Merge Videos from Selected Frame">
          <Button
            variant="surface"
            color="green"
            onClick={handleMergeVideos}
            disabled={isMerging}
            style={{
              cursor: isMerging ? "not-allowed" : "pointer",
              background: isMerging 
                ? "rgba(200, 200, 200, 0.6)"
                : "linear-gradient(135deg, rgba(167, 243, 208, 0.6), rgba(52, 211, 153, 0.6))",
              border: "2px solid rgba(52, 211, 153, 0.3)",
              borderRadius: "12px",
              fontWeight: 600,
            }}
            className="hover:scale-105 transition-all"
          >
            {isMerging ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
            {isMerging ? "Creating Magic..." : "Merge Videos"}
          </Button>
        </Tooltip>
      </Flex>
    </div>
  );
};
