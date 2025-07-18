import cairosvg
from PIL import Image
import io

# Convert SVG to PNG first
svg_path = "public/cube-icon.svg"
ico_path = "public/favicon.ico"

# Read SVG file
with open(svg_path, 'r') as svg_file:
    svg_content = svg_file.read()

# Convert SVG to PNG bytes for different sizes
sizes = [16, 32, 48, 64, 128, 256]
images = []

for size in sizes:
    png_bytes = cairosvg.svg2png(
        bytestring=svg_content.encode('utf-8'),
        output_width=size,
        output_height=size
    )
    
    # Convert PNG bytes to PIL Image
    img = Image.open(io.BytesIO(png_bytes))
    images.append(img)

# Save as ICO file with multiple sizes
images[0].save(
    ico_path,
    format='ICO',
    sizes=[(img.width, img.height) for img in images],
    append_images=images[1:]
)

print(f"Successfully created {ico_path} with sizes: {[img.size for img in images]}")
