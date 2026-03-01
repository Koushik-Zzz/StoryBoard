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
    const backendUrl = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

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
        p="3"
        gap="3"
        style={{
          background: "#FFF9E3",
          border: "3px solid #2D3047",
          boxShadow: "4px 4px 0 #2D3047",
          borderRadius: "16px",
        }}
      >
        <Tooltip content="Start fresh with a clean canvas!">
          <Button
            variant="surface"
            onClick={onClear}
            style={{
              cursor: "pointer",
              background: "#FF6CAB",
              border: "4px solid #2D3047",
              boxShadow: "3px 3px 0 #2D3047",
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "15px",
              padding: "12px 20px",
              color: "#2D3047",
            }}
            className="hover:translate-y-[-2px] hover:shadow-[4px_4px_0_#2D3047] active:translate-y-[1px] active:shadow-[2px_2px_0_#2D3047] transition-all"
          >
            <Eraser size={18} />
            Clean Canvas 🧹
          </Button>
        </Tooltip>

        <Tooltip content="Combine all your videos into one awesome movie!">
          <Button
            variant="surface"
            onClick={handleMergeVideos}
            disabled={isMerging}
            style={{
              cursor: isMerging ? "not-allowed" : "pointer",
              background: isMerging ? "#ccc" : "#FF8C42",
              border: "4px solid #2D3047",
              boxShadow: isMerging ? "2px 2px 0 #2D3047" : "3px 3px 0 #2D3047",
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "15px",
              padding: "12px 20px",
              color: "#2D3047",
              opacity: isMerging ? 0.7 : 1,
            }}
            className="hover:translate-y-[-2px] hover:shadow-[4px_4px_0_#2D3047] active:translate-y-[1px] active:shadow-[2px_2px_0_#2D3047] transition-all"
          >
            {isMerging ? <Loader2 size={18} className="animate-spin" /> : <Video size={18} />}
            {isMerging ? "Making Magic... ✨" : "Make My Movie! 🎬"}
          </Button>
        </Tooltip>
      </Flex>
    </div>
  );
};
