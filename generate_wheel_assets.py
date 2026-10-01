import numpy as np
from PIL import Image
from scipy.ndimage import label
import base64
import io
import os

img = Image.open('raw_extracted_wheel.png')
arr = np.array(img, dtype=np.float32)
h, w = arr.shape[:2]
cy, cx = 539.5, 539.5

y, x = np.ogrid[:h, :w]
dist = np.sqrt((x - cx)**2 + (y - cy)**2)

# --- Common masks ---
# Charcoal pixels (lines, glyphs, center disc)
charcoal_mask = (arr[:, :, 3] > 60) & (arr[:, :, 0] < 100) & (arr[:, :, 1] < 100) & (arr[:, :, 2] < 100)
# Center disc is r < 100
center_disc_mask = (dist < 100) & charcoal_mask
# Center stars are inside center disc (r < 100) with high RGB
center_stars_mask = (dist < 100) & (arr[:, :, 0] > 120) & (arr[:, :, 3] > 60)
# Inner accent ring (r = 104.5 to 107.0)
inner_ring_mask = (dist >= 104.5) & (dist <= 107.0) & (arr[:, :, 3] > 50)
# Outer band 12 circles (r ~ 395)
outer_band = (dist >= 350) & (dist <= 435) & (arr[:, :, 3] > 100)
labeled, num_features = label(outer_band)
sizes = [(labeled == i).sum() for i in range(1, num_features+1)]
outer_circles_mask = np.zeros((h, w), dtype=bool)
for idx, sz in enumerate(sizes):
    if 100 <= sz <= 150:
        outer_circles_mask |= (labeled == (idx + 1))

# Non-center charcoal lines (all constellation lines, radial dividers, outer rims, zodiac symbols)
linework_mask = charcoal_mask & (~center_disc_mask) & (~inner_ring_mask) & (~outer_circles_mask)

# ==========================================
# 1. LIGHT MODE WHEEL
# ==========================================
arr_light = arr.copy()
# Linework: rich dark charcoal
arr_light[linework_mask, 0] = 43.0  # #2B2D31
arr_light[linework_mask, 1] = 45.0
arr_light[linework_mask, 2] = 49.0

# Center disc: dark charcoal
arr_light[center_disc_mask, 0] = 43.0
arr_light[center_disc_mask, 1] = 45.0
arr_light[center_disc_mask, 2] = 49.0

# Center stars: luminous antique gold #E5B842
b_light = arr[center_stars_mask, 0] / 255.0
arr_light[center_stars_mask, 0] = 229.0 * b_light + 26.0 * (b_light**2)
arr_light[center_stars_mask, 1] = 184.0 * b_light + 56.0 * (b_light**2)
arr_light[center_stars_mask, 2] = 66.0 * b_light + 130.0 * (b_light**2)

# Inner ring: antique gold #D4AF37
arr_light[inner_ring_mask, 0] = 212.0
arr_light[inner_ring_mask, 1] = 175.0
arr_light[inner_ring_mask, 2] = 55.0

# 12 outer circles: antique gold #D4AF37
arr_light[outer_circles_mask, 0] = 212.0
arr_light[outer_circles_mask, 1] = 175.0
arr_light[outer_circles_mask, 2] = 55.0

img_light = Image.fromarray(np.clip(arr_light, 0, 255).astype(np.uint8))
img_light.save('astro-kaur-web/public/astrology-wheel-light.png')

# ==========================================
# 2. DARK MODE WHEEL
# ==========================================
arr_dark = arr.copy()
# Linework: luminous antique gold / warm celestial gold #E2CE9F
arr_dark[linework_mask, 0] = 226.0
arr_dark[linework_mask, 1] = 206.0
arr_dark[linework_mask, 2] = 159.0

# Center disc: deep celestial navy #121927
arr_dark[center_disc_mask, 0] = 18.0
arr_dark[center_disc_mask, 1] = 25.0
arr_dark[center_disc_mask, 2] = 39.0

# Center stars: bright gold #FFE082
b_dark = arr[center_stars_mask, 0] / 255.0
arr_dark[center_stars_mask, 0] = 255.0 * b_dark
arr_dark[center_stars_mask, 1] = 224.0 * b_dark + 31.0 * (b_dark**2)
arr_dark[center_stars_mask, 2] = 130.0 * b_dark + 125.0 * (b_dark**2)

# Inner ring: radiant antique gold #F3D37A
arr_dark[inner_ring_mask, 0] = 243.0
arr_dark[inner_ring_mask, 1] = 211.0
arr_dark[inner_ring_mask, 2] = 122.0

# 12 outer circles: radiant antique gold #F3D37A
arr_dark[outer_circles_mask, 0] = 243.0
arr_dark[outer_circles_mask, 1] = 211.0
arr_dark[outer_circles_mask, 2] = 122.0

img_dark = Image.fromarray(np.clip(arr_dark, 0, 255).astype(np.uint8))
img_dark.save('astro-kaur-web/public/astrology-wheel-dark.png')

# Function to create SVG from PNG
def create_svg(png_img, svg_path):
    buffer = io.BytesIO()
    png_img.save(buffer, format='PNG', optimize=True)
    b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="100%" height="100%" fill="none">
  <image href="data:image/png;base64,{b64}" width="1080" height="1080" preserveAspectRatio="xMidYMid meet" />
</svg>'''
    with open(svg_path, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f'Wrote {svg_path} ({len(svg_content)} bytes)')

create_svg(img_light, 'astro-kaur-web/public/astrology-wheel-light.svg')
create_svg(img_light, 'astro-kaur-web/public/astrology-wheel.svg')
create_svg(img_light, 'astro-kaur-web/public/Rotating Horoscope Wheel.svg')
create_svg(img_dark, 'astro-kaur-web/public/astrology-wheel-dark.svg')
print('Successfully generated all wheel SVG & PNG assets!')
