
def _truncate(text: str, max_chars: int = 600) -> str:
    """Truncate text to max_chars, breaking at the last space."""
    if not text or len(text) <= max_chars:
        return text or ""
    return text[:max_chars].rsplit(' ', 1)[0] + "..."


def create_video_prompt(custom_prompt: str, global_context: str, annotation_description: str) -> str:
    # Truncate annotation description to avoid excessively long prompts
    annotation_summary = _truncate(annotation_description, 600)
    return f"""
    context: {global_context}
    Generate a creative video based on the following input: {custom_prompt}
    Here are the animation annotations detected in the source image: {annotation_summary}
    The image will have annotations describing how the scene should look. the annotations guide the movement and visual style, YOU MUST REMOVE THEM IN THE final video.
    The video should be visually engaging and dynamic. stay true to the style of the source material. If request is difficult, perform a HARD cut. 
    """