#!/usr/bin/env python3
# Edge preprocessor ($0, on-device class): ball clip -> contact + end stills.
# Three-frame differencing in the pitch corridor finds the delivery blob;
# the track's last frame is contact (ball at bat). Audio SNR at contact is
# computed locally. Only the two stills ever leave the device.
# Usage: edge-select.py <clip.mp4> <ball_id> <outdir> [fps]
import json, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image

clip, ball_id, outdir = sys.argv[1], sys.argv[2], Path(sys.argv[3])
fps = int(sys.argv[4]) if len(sys.argv) > 4 else 15
# --onset-s: seconds into clip where the audio onset picker fired on the
# continuous stream (the real edge contract; clips are segmented around it)
onset_s = None
if "--onset-s" in sys.argv:
    onset_s = float(sys.argv[sys.argv.index("--onset-s") + 1])
# --snr-db: onset SNR measured on the continuous stream (onsets.mjs method:
# peak vs preceding-3s median). Clip-local audio can't reproduce it — the
# pre-clip crowd roar is cut off — so the stream value is carried through.
snr_override = None
if "--snr-db" in sys.argv:
    snr_override = float(sys.argv[sys.argv.index("--snr-db") + 1])
outdir.mkdir(parents=True, exist_ok=True)
work = Path(f"/tmp/edge/{ball_id}")
work.mkdir(parents=True, exist_ok=True)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", clip, "-vf", f"fps={fps}",
                str(work / "f%03d.png")], check=True)
frames = sorted(work.glob("f*.png"))
N = len(frames)
X0, X1, Y0, Y1 = 200, 1100, 150, 600

def gray(i):
    return np.asarray(Image.open(frames[i]).convert("L"), dtype=np.int16)[Y0:Y1, X0:X1]

g = [gray(i) for i in range(N)]
cands = []
for i in range(1, N - 1):
    d = np.abs(g[i - 1] - g[i]) + np.abs(g[i] - g[i + 1])
    small = (d > 40)[::4, ::4]
    seen = np.zeros_like(small, bool)
    h, w = small.shape
    for yy in range(h):
        for xx in range(w):
            if small[yy, xx] and not seen[yy, xx]:
                stack = [(yy, xx)]; seen[yy, xx] = True; px = []
                while stack:
                    cy, cx = stack.pop(); px.append((cy, cx))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and small[ny, nx] and not seen[ny, nx]:
                                seen[ny, nx] = True; stack.append((ny, nx))
                if 2 <= len(px) <= 400:
                    cands.append((i, sum(p[1] for p in px) / len(px) * 4 + X0,
                                  sum(p[0] for p in px) / len(px) * 4 + Y0))
tracks = []
used = set()
for idx, (f, x, y) in enumerate(cands):
    if idx in used: continue
    tr = [(f, x, y)]; used.add(idx); cf, cx, cy = f, x, y
    for j in range(idx + 1, len(cands)):
        f2, x2, y2 = cands[j]
        if f2 > cf + 2: break
        step = abs(x2 - cx) + abs(y2 - cy)
        if f2 > cf and 20 < step < 90:
            tr.append((f2, x2, y2)); used.add(j); cf, cx, cy = f2, x2, y2
    if 4 <= len(tr) <= 30: tracks.append(tr)

def disp(tr): return abs(tr[-1][1] - tr[0][1]) + abs(tr[-1][2] - tr[0][2])
import os
if os.environ.get("DEBUG"):
    for tr in sorted(tracks, key=disp, reverse=True)[:10]:
        print(f"DBG len={len(tr)} f={tr[0][0]}-{tr[-1][0]} from=({tr[0][1]:.0f},{tr[0][2]:.0f}) to=({tr[-1][1]:.0f},{tr[-1][2]:.0f}) disp={disp(tr):.0f}", file=sys.stderr)
if onset_s is not None:
    # contact = audio onset frame; blob track within +-1s confirms motion.
    # (blob-only contact was 5/6: b32's max track is the returning ball.)
    contact_f = int(onset_s * fps)
    confirmed = any(tr[0][0] - 15 <= contact_f <= tr[-1][0] + 15 for tr in tracks)
    source = "audio-onset+blob" if confirmed else "audio-onset"
elif tracks:
    best = max(tracks, key=disp)
    contact_f, source = best[-1][0], "blob-track"
else:  # fallback: loudest motion frame in corridor
    energy = [float(np.abs(g[i] - g[i - 1]).mean()) for i in range(1, N)]
    contact_f, source = int(np.argmax(energy)) + 1, "motion-peak"
end_f = min(N - 1, contact_f + int(2.5 * fps))

# audio SNR at contact (local, 16kHz mono)
pcm = work / "a.pcm"
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", clip, "-f", "s16le",
                "-ac", "1", "-ar", "16000", str(pcm)], check=True)
raw = np.fromfile(pcm, dtype=np.int16).astype(float) / 32768
win = 800
rms = np.array([np.sqrt((raw[i * win:(i + 1) * win] ** 2).mean()) + 1e-9
                for i in range(len(raw) // win)])
db = 20 * np.log10(rms)
cw = min(len(db) - 1, int(contact_f / fps / 0.05))
# floor = pre-contact crowd (first 2s); post-hit swell would poison a global median
floor = np.median(db[:40]) if len(db) > 40 else np.median(db)
snr = float(np.max(db[max(0, cw - 5):cw + 6]) - floor)
if snr_override is not None:
    snr = snr_override

for name, f in [("contact", contact_f), ("end", end_f)]:
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", str(f / fps), "-i", clip,
                    "-frames:v", "1", "-q:v", "3", str(outdir / f"{ball_id}-{name}.jpg")], check=True)
entry = {"delivery_id": ball_id,
         "contact": str(outdir / f"{ball_id}-contact.jpg"),
         "end": str(outdir / f"{ball_id}-end.jpg"),
         "audio_snr_db": round(snr, 1),
         "edge": {"contact_frame": contact_f, "source": source, "frames_scanned": N}}
print(json.dumps(entry))
