from PIL import Image, ImageDraw
import os

# Create a simple cube icon using PIL
def create_cube_icon(size):
    # Create a new image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Calculate proportions
    center = size // 2
    cube_size = size * 0.6
    
    # Define cube vertices (simplified 3D cube)
    top_y = center - cube_size // 3
    bottom_y = center + cube_size // 3
    left_x = center - cube_size // 3
    right_x = center + cube_size // 3
    
    # Colors
    primary_color = (59, 130, 246, 200)  # Blue
    secondary_color = (29, 78, 216, 150)  # Darker blue
    outline_color = (59, 130, 246, 255)
    
    # Draw cube faces
    # Top face (diamond shape)
    top_points = [
        (center, top_y),
        (right_x, center - cube_size // 6),
        (center, center),
        (left_x, center - cube_size // 6)
    ]
    draw.polygon(top_points, fill=primary_color, outline=outline_color)
    
    # Left face
    left_points = [
        (center, center),
        (left_x, center - cube_size // 6),
        (left_x, bottom_y + cube_size // 6),
        (center, bottom_y)
    ]
    draw.polygon(left_points, fill=secondary_color, outline=outline_color)
    
    # Right face
    right_points = [
        (center, center),
        (right_x, center - cube_size // 6),
        (right_x, bottom_y + cube_size // 6),
        (center, bottom_y)
    ]
    draw.polygon(right_points, fill=primary_color, outline=outline_color)
    
    # Add some detail dots
    dot_size = max(1, size // 16)
    dot_color = (255, 255, 255, 180)
    
    # Top face dots
    draw.ellipse([center - dot_size, top_y + size//8 - dot_size, 
                  center + dot_size, top_y + size//8 + dot_size], fill=dot_color)
    
    # Left face dots
    draw.ellipse([left_x + size//12 - dot_size, center + size//12 - dot_size, 
                  left_x + size//12 + dot_size, center + size//12 + dot_size], fill=dot_color)
    
    # Right face dots
    draw.ellipse([right_x - size//12 - dot_size, center + size//12 - dot_size, 
                  right_x - size//12 + dot_size, center + size//12 + dot_size], fill=dot_color)
    
    return img

# Create ICO file with multiple sizes
sizes = [16, 32, 48, 64, 128, 256]
images = []

for size in sizes:
    img = create_cube_icon(size)
    images.append(img)

# Save as ICO file
ico_path = "public/favicon.ico"
images[0].save(
    ico_path,
    format='ICO',
    sizes=[(img.width, img.height) for img in images],
    append_images=images[1:]
)

print(f"Successfully created {ico_path} with sizes: {[img.size for img in images]}")

# Also create a PNG version for testing
png_path = "public/cube-favicon.png"
images[4].save(png_path, format='PNG')  # Use 128x128 size
print(f"Also created {png_path} for reference")
