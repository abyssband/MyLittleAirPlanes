#!/usr/bin/env python3
"""
Unified Sprite Processor & Texture Atlas Generator
Usage: python3 process_sprites.py --character panda [--atlas] [--brain-dir path] [--assets-dir path]

This script:
1. Finds the latest generated sprite frames for a character in the specified brain directory.
2. Removes the green screen background.
3. Calculates a unified bounding box across ALL 20 frames so animations don't jitter.
4. Crops and resizes them to a uniform 512x512 size.
5. Saves individual frames to the assets folder.
6. (Optional) Packs all 20 frames into a single Texture Atlas (spritesheet) and generates a JSON map.
"""
import os
import sys
import glob
import math
import json
import argparse
from PIL import Image
import numpy as np

# Default paths
DEFAULT_BRAIN = "/Users/abyss/.gemini/antigravity/brain/ddda1ddd-dcc4-490a-9551-290057dd8126"
DEFAULT_ASSETS = "/Users/abyss/Documents/Projects/MyLittleAirPlanes/assets/sprites"
SIZE = 512

REQUIRED_FRAMES = [
    "fly_1", "fly_2", "fly_3", "fly_4", "fly_5", "fly_6",
    "ascend_1", "ascend_2", "ascend_3", "ascend_4", "ascend_5", "ascend_6",
    "descend_1", "descend_2", "descend_3", "descend_4", "descend_5", "descend_6",
    "happy", "hit", "crash", "land_success", "land_fail", "idle"
]

def remove_green_pixels(img):
    img = img.convert('RGBA')
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            
            # Determine maximum non-green channel
            max_rb = max(r, b)
            
            # Calculate how dominant the green channel is
            g_diff = g - max_rb
            
            if g_diff > 60:
                # Definitely background
                pixels[x, y] = (0, 0, 0, 0)
            elif g_diff > 10:
                # Edge pixel / color spill
                # Calculate alpha factor (from 1.0 down to 0.0)
                factor = 1.0 - ((g_diff - 10) / 50.0)
                factor = max(0.0, min(1.0, factor))
                
                # Spill suppression: gracefully reduce green hue on edges
                new_g = int(max_rb + (g_diff * factor))
                new_a = int(a * factor)
                
                pixels[x, y] = (r, min(255, new_g), b, new_a)
                
    return img

def find_latest_file(pattern):
    files = glob.glob(pattern)
    if not files:
        return None
    # Sort by modification time, newest first
    files.sort(key=os.path.getmtime, reverse=True)
    return files[0]

def build_sprite_map(character, brain_dir):
    sprite_map = {}
    for frame in REQUIRED_FRAMES:
        # Example pattern: /brain/cat_fly_1_177...png or /brain/cat_fly_1.png
        # Find all files starting with {character}_{frame} and ending with .png
        pattern = os.path.join(brain_dir, f"{character}_{frame}*.png")
        latest = find_latest_file(pattern)
        if latest:
            sprite_map[f"{character}_{frame}"] = latest
        else:
            print(f"  ⚠️ MISSING in BRAIN: {character}_{frame}")
    return sprite_map

def pack_texture_atlas(character, processed_images, out_dir):
    print(f"\n📦 Packing Texture Atlas for {character}...")
    frames = list(processed_images.items())
    num_frames = len(frames)
    
    # Calculate grid size (e.g. 5 columns)
    cols = 5
    rows = math.ceil(num_frames / cols)
    
    atlas_w = cols * SIZE
    atlas_h = rows * SIZE
    
    atlas_img = Image.new('RGBA', (atlas_w, atlas_h), (0, 0, 0, 0))
    atlas_json = {
        "frames": {},
        "meta": {
            "image": f"{character}_atlas.png",
            "format": "RGBA8888",
            "size": {"w": atlas_w, "h": atlas_h},
            "scale": "1"
        }
    }
    
    for idx, (frame_name, img) in enumerate(frames):
        col = idx % cols
        row = idx // cols
        x = col * SIZE
        y = row * SIZE
        
        atlas_img.paste(img, (x, y))
        
        # Add to JSON map
        atlas_json["frames"][frame_name] = {
            "frame": {"x": x, "y": y, "w": SIZE, "h": SIZE},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": SIZE, "h": SIZE},
            "sourceSize": {"w": SIZE, "h": SIZE}
        }
        
    # Save atlas and JSON
    png_path = os.path.join(out_dir, f"{character}_atlas.png")
    json_path = os.path.join(out_dir, f"{character}_atlas.json")
    
    atlas_img.save(png_path, 'PNG')
    with open(json_path, 'w') as f:
        json.dump(atlas_json, f, indent=2)
        
    print(f"  ✅ Saved Atlas Image: {png_path}")
    print(f"  ✅ Saved Atlas Map  : {json_path}")

def align_images_centroid(processed_dict, character):
    """Fast centroid-based alignment: compute center of mass from alpha channel,
    then shift all frames so their centroids align to the average position."""
    if not processed_dict: return processed_dict
    
    print(f"\n  🎯 Centroid-aligning frames...")
    
    # Step 1: Compute centroid (center of mass) for each frame
    centroids = {}
    for key, img in processed_dict.items():
        alpha = np.array(img)[:,:,3].astype(float)
        total = np.sum(alpha)
        if total < 1: 
            centroids[key] = (img.size[0]//2, img.size[1]//2)
            continue
        ys, xs = np.mgrid[0:alpha.shape[0], 0:alpha.shape[1]]
        cx = np.sum(xs * alpha) / total
        cy = np.sum(ys * alpha) / total
        centroids[key] = (cx, cy)
        
    # Step 2: Compute the average centroid as the target
    avg_cx = sum(c[0] for c in centroids.values()) / len(centroids)
    avg_cy = sum(c[1] for c in centroids.values()) / len(centroids)
    print(f"    Average centroid: ({avg_cx:.1f}, {avg_cy:.1f})")
    
    # Step 3: Shift each frame to match the average centroid
    aligned = {}
    for key, img in processed_dict.items():
        cx, cy = centroids[key]
        dx = int(round(avg_cx - cx))
        dy = int(round(avg_cy - cy))
        
        if abs(dx) > 1 or abs(dy) > 1:
            shifted = img.transform(img.size, Image.AFFINE, (1, 0, -dx, 0, 1, -dy), resample=Image.BICUBIC)
            aligned[key] = shifted
            print(f"    - {key}: centroid ({cx:.0f},{cy:.0f}) → shift ({dx},{dy})")
        else:
            aligned[key] = img
            print(f"    - {key}: centroid ({cx:.0f},{cy:.0f}) ✓ already centered")
    
    return aligned

def process_character(character, args):
    print(f"\n{'='*50}")
    print(f"  🚀 Processing {character.capitalize()} Sprites")
    print(f"{'='*50}")
    
    sprite_map = build_sprite_map(character, args.brain_dir)
    if not sprite_map:
        print(f"❌ No source images found for {character} in {args.brain_dir}")
        return

    processed = {}
    for frame_name, src_path in sprite_map.items():
        img = Image.open(src_path).convert('RGBA')
        img = img.resize((1024, 1024), Image.LANCZOS)
        img = remove_green_pixels(img)
        processed[frame_name] = img
        print(f"  ✓ Background removed: {frame_name} (from {os.path.basename(src_path)})")
        
    if not processed: return

    # Auto-align images using centroid (skip if --no-align)
    if not args.no_align:
        processed = align_images_centroid(processed, character)
    else:
        print("\n  ⏭️  Skipping auto-alignment (--no-align)")

    # Calculate union bounding box
    union_bbox = None
    for img in processed.values():
        bbox = img.getbbox()
        if bbox is None: continue
        if union_bbox is None: 
            union_bbox = bbox
        else: 
            union_bbox = (
                min(union_bbox[0], bbox[0]),
                min(union_bbox[1], bbox[1]),
                max(union_bbox[2], bbox[2]),
                max(union_bbox[3], bbox[3])
            )
            
    if union_bbox is None: 
        print("❌ Could not calculate bounding box. Images might be empty after green screen removal.")
        return

    ux1, uy1, ux2, uy2 = union_bbox
    cx, cy = (ux1+ux2)/2, (uy1+uy2)/2
    max_dim = max(ux2-ux1, uy2-uy1)
    
    # Add 8% padding
    pad = int(max_dim * 0.08)
    half = max_dim/2 + pad
    
    crop_x1, crop_y1 = int(max(0, cx-half)), int(max(0, cy-half))
    crop_x2, crop_y2 = int(min(1024, cx+half)), int(min(1024, cy+half))
    
    # Make square
    cw, ch = crop_x2-crop_x1, crop_y2-crop_y1
    if cw != ch:
        diff = abs(cw-ch)
        if cw > ch: 
            crop_y1 = max(0, crop_y1-diff//2)
            crop_y2 = min(1024, crop_y2+(diff-diff//2))
        else: 
            crop_x1 = max(0, crop_x1-diff//2)
            crop_x2 = min(1024, crop_x2+(diff-diff//2))
            
    print(f"\n  📐 Unified Crop Box: ({crop_x1},{crop_y1}) → ({crop_x2},{crop_y2})")
    
    # Output directory
    os.makedirs(args.assets_dir, exist_ok=True)
    
    final_processed_images = {}

    print("\n  💾 Saving Individual Frames...")
    for frame_name, img in processed.items():
        cropped = img.crop((crop_x1, crop_y1, crop_x2, crop_y2))
        cw, ch = cropped.size
        if cw != ch:
            sq = max(cw, ch)
            square = Image.new('RGBA', (sq, sq), (0, 0, 0, 0))
            square.paste(cropped, ((sq-cw)//2, (sq-ch)//2))
            cropped = square
            
        final = cropped.resize((SIZE, SIZE), Image.LANCZOS)
        out_path = os.path.join(args.assets_dir, f"{frame_name}.png")
        final.save(out_path, 'PNG')
        final_processed_images[frame_name] = final
        print(f"  ✅ Saved -> {frame_name}.png")

    if args.atlas:
        pack_texture_atlas(character, final_processed_images, args.assets_dir)

    print("\n🎉 All Done!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process and pack character sprites.")
    parser.add_argument("--character", required=True, help="Character name (e.g., cat, panda, rabbit, labrador)")
    parser.add_argument("--atlas", action="store_true", help="Generate a texture atlas (spritesheet) and JSON map")
    parser.add_argument("--brain-dir", default=DEFAULT_BRAIN, help="Directory containing raw generated images")
    parser.add_argument("--assets-dir", default=DEFAULT_ASSETS, help="Output directory for processed sprites")
    parser.add_argument("--no-align", action="store_true", help="Skip auto-alignment step (for sprite-sheet-sourced frames)")
    
    args = parser.parse_args()
    process_character(args.character.lower(), args)
