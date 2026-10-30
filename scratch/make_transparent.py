import math
import os
from PIL import Image

src_path = r"C:\Users\manex\.gemini\antigravity-ide\brain\84beba95-118d-4c91-9580-1186bd3fe7ed\dayumi_d_transparent_1793157274642.jpg"
im = Image.open(src_path).convert("RGB")
w, h = im.size

out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
in_pixels = im.load()
out_pixels = out.load()

# Thresholds for black extraction
BLACK_THRESHOLD = 8
FULL_OPACITY_THRESHOLD = 65

for y in range(h):
    for x in range(w):
        r, g, b = in_pixels[x, y]
        # Brightness based on max channel or perceived luminance
        brightness = max(r, g, b)
        
        if brightness <= BLACK_THRESHOLD:
            out_pixels[x, y] = (0, 0, 0, 0)
        elif brightness >= FULL_OPACITY_THRESHOLD:
            out_pixels[x, y] = (r, g, b, 255)
        else:
            # Smooth cubic or cosine curve for anti-aliased edge
            t = (brightness - BLACK_THRESHOLD) / (FULL_OPACITY_THRESHOLD - BLACK_THRESHOLD)
            alpha = int(255 * (t * t * (3 - 2 * t))) # smoothstep
            if alpha <= 0:
                out_pixels[x, y] = (0, 0, 0, 0)
            else:
                # Unpremultiply color so edge glow doesn't get dark/muddy
                factor = 255.0 / alpha
                nr = min(255, int(r * factor))
                ng = min(255, int(g * factor))
                nb = min(255, int(b * factor))
                out_pixels[x, y] = (nr, ng, nb, alpha)

# Save test output
os.makedirs("scratch", exist_ok=True)
test_out = r"scratch\dayumi_d_transparent.png"
out.save(test_out, "PNG")
print("Saved transparent image to", test_out)

# Check bounds to crop cleanly or keep 1:1 square
bbox = out.getbbox()
print("Non-empty bounding box:", bbox)
