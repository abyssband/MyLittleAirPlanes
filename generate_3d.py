"""
Text-to-3D using Shap-E (OpenAI)
Usage: python3 generate_3d.py "your text prompt here"
Output: triposr_output/0/mesh.glb  (viewable at http://localhost:8081/preview3d.html?load=triposr_output/0/mesh.glb)
"""
import sys
import os
import ssl
import torch

# Patch SSL to bypass self-signed cert issues (needed for CLIP model download check)
ssl._create_default_https_context = ssl._create_unverified_context

# --- Config ---
PROMPT = sys.argv[1] if len(sys.argv) > 1 else "a chubby orange cat airplane, kawaii cartoon style, cute"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "triposr_output", "0")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "mesh.glb")
GUIDANCE_SCALE = 15.0
N_STEPS = 64

# Use MPS on Apple Silicon (patched float64 bug in gaussian_diffusion.py)
device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
print(f"🖥️  Device: {device}")
print(f"📝 Prompt: {PROMPT}")

from shap_e.diffusion.sample import sample_latents
from shap_e.diffusion.gaussian_diffusion import diffusion_from_config
from shap_e.models.download import load_model, load_config

print("⬇️  Loading Shap-E models (downloads on first run)...")
xm = load_model('transmitter', device=device)
model = load_model('text300M', device=device)
diffusion = diffusion_from_config(load_config('diffusion'))

print(f"🎨 Generating 3D mesh from: \"{PROMPT}\"")
latents = sample_latents(
    batch_size=1,
    model=model,
    diffusion=diffusion,
    guidance_scale=GUIDANCE_SCALE,
    model_kwargs=dict(texts=[PROMPT]),
    progress=True,
    clip_denoised=True,
    use_fp16=True,
    use_karras=True,
    karras_steps=N_STEPS,
    sigma_min=1e-3,
    sigma_max=160,
    s_churn=0,
)

os.makedirs(OUTPUT_DIR, exist_ok=True)
print(f"💾 Saving mesh → {OUTPUT_PATH}")

import numpy as np
from shap_e.util.collections import AttrDict
from shap_e.models.nn.camera import DifferentiableProjectiveCamera, DifferentiableCameraBatch

def create_pan_cameras(size, device):
    """Inlined from shap_e/util/notebooks.py (avoids ipywidgets import)."""
    origins, xs, ys, zs = [], [], [], []
    for theta in np.linspace(0, 2 * np.pi, num=20):
        z = np.array([np.sin(theta), np.cos(theta), -0.5])
        z /= np.sqrt(np.sum(z**2))
        origin = -z * 4
        x = np.array([np.cos(theta), -np.sin(theta), 0.0])
        y = np.cross(z, x)
        origins.append(origin); xs.append(x); ys.append(y); zs.append(z)
    return DifferentiableCameraBatch(
        shape=(1, len(xs)),
        flat_camera=DifferentiableProjectiveCamera(
            origin=torch.from_numpy(np.stack(origins)).float().to(device),
            x=torch.from_numpy(np.stack(xs)).float().to(device),
            y=torch.from_numpy(np.stack(ys)).float().to(device),
            z=torch.from_numpy(np.stack(zs)).float().to(device),
            width=size, height=size, x_fov=0.7, y_fov=0.7,
        ),
    )

with torch.no_grad():
    cameras = create_pan_cameras(2, device)
    params = xm.encoder.bottleneck_to_params(latents[0][None])
    decoded = xm.renderer.render_views(
        AttrDict(cameras=cameras),
        params=params,
        options=AttrDict(rendering_mode="stf", render_with_direction=False),
    )
    t = decoded.raw_meshes[0].tri_mesh()

import io
import trimesh

# Save as PLY first (what TriMesh supports), then convert to GLB via trimesh
ply_buf = io.BytesIO()
t.write_ply(ply_buf)
ply_buf.seek(0)

mesh_obj = trimesh.load(ply_buf, file_type='ply')
glb_data = mesh_obj.export(file_type='glb')

with open(OUTPUT_PATH, 'wb') as f:
    f.write(glb_data)

print(f"✅ Done! Open in browser:")
print(f"   http://localhost:8081/preview3d.html?load=triposr_output/0/mesh.glb")
