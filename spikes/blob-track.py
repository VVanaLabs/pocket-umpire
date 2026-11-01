# Blob ball tracker v1: three-frame differencing in the pitch corridor,
# link blobs across frames, keep the longest fast trajectory near the hit.
import numpy as np
from PIL import Image
import sys, json

clip = sys.argv[1]  # b32 | b227
N = 105
W, H = 1280, 720
# pitch corridor: middle band where the ball lives (generous, fixed cam)
X0, X1, Y0, Y1 = 200, 1100, 150, 600

def gray(i):
    im = Image.open(f"/tmp/blob/{clip}_f{i:03d}.png").convert("L")
    return np.asarray(im, dtype=np.int16)[Y0:Y1, X0:X1]

frames = [gray(i) for i in range(1, N + 1)]
cands = []  # (frame_idx, x, y, area)
for i in range(1, N - 1):
    d = np.abs(frames[i - 1] - frames[i]) + np.abs(frames[i] - frames[i + 1])
    mask = d > 40
    # connected components via simple flood on downsampled grid
    small = mask[::4, ::4]
    seen = np.zeros_like(small, bool)
    h, w = small.shape
    for yy in range(h):
        for xx in range(w):
            if small[yy, xx] and not seen[yy, xx]:
                # BFS
                stack = [(yy, xx)]; seen[yy, xx] = True; px = []
                while stack:
                    cy, cx = stack.pop(); px.append((cy, cx))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and small[ny, nx] and not seen[ny, nx]:
                                seen[ny, nx] = True; stack.append((ny, nx))
                area = len(px)
                if 2 <= area <= 400:  # small fast things, not fielders
                    my = sum(p[0] for p in px) / area * 4 + Y0
                    mx = sum(p[1] for p in px) / area * 4 + X0
                    cands.append((i, mx, my, area))
# greedy linking: nearest within 120px in next 3 frames
tracks = []
used = set()
for idx, (f, x, y, a) in enumerate(cands):
    if idx in used:
        continue
    tr = [(f, x, y)]; used.add(idx)
    cf, cx, cy = f, x, y
    for f2, x2, y2, a2 in cands[idx + 1:]:
        if f2 > cf + 2:
            break
        step = abs(x2 - cx) + abs(y2 - cy)
        if f2 > cf and 20 < step < 90:  # ball per-frame jump at 15fps
            tr.append((f2, x2, y2)); used.add(cands.index((f2, x2, y2, a2)) if (f2, x2, y2, a2) in cands else -1)
            cf, cx, cy = f2, x2, y2
    if len(tr) >= 4:
        tracks.append(tr)
# ball crosses in 4-30 frames; 98-frame chains are flicker. rank by displacement
fast = [tr for tr in tracks if 4 <= len(tr) <= 30]
fast.sort(key=lambda tr: abs(tr[-1][1] - tr[0][1]) + abs(tr[-1][2] - tr[0][2]), reverse=True)
print(f"{clip}: {len(cands)} candidates, {len(tracks)} tracks>=4f, {len(fast)} fast")
for tr in fast[:6]:
    f0, x0, y0 = tr[0]; f1, x1, y1 = tr[-1]
    dxdt = (x1 - x0) / max(1, (f1 - f0)) * 15
    print(f"  len={len(tr)} f={f0}-{f1} from=({x0:.0f},{y0:.0f}) to=({x1:.0f},{y1:.0f}) vx={dxdt:.0f}px/s")
json.dump(fast[:4], open(f"/tmp/blob/{clip}_tracks.json", "w"))
