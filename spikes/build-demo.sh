#!/bin/bash
# 3-min demo assembly: Pillow cards/captions (ffmpeg build has no drawtext),
# blob-track overlay render, normalized segments, concat. All assets /tmp.
set -e
mkdir -p /tmp/demo
cd "$(cd "$(dirname "$0")/.." && pwd)"
/tmp/venv/bin/python - <<'EOF'
import json
from PIL import Image, ImageDraw, ImageFont
FB = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FR = "/System/Library/Fonts/Supplemental/Arial.ttf"
BG = (10, 15, 10); GREEN = (125, 255, 138); AMBER = (255, 215, 93); INK = (232, 240, 232); DIM = (170, 190, 170)
def card(name, title, lines, accent=GREEN):
    img = Image.new("RGB", (1280, 720), BG); d = ImageDraw.Draw(img)
    d.rectangle([0, 300, 1280, 308], fill=accent)
    d.text((70, 180), title, font=ImageFont.truetype(FB, 54), fill=accent)
    y = 340
    for ln in lines:
        d.text((70, y), ln, font=ImageFont.truetype(FR, 34), fill=INK); y += 52
    img.save(f"/tmp/demo/card_{name}.png")
def caption(name, text):
    img = Image.new("RGBA", (1280, 720), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    f = ImageFont.truetype(FB, 40); bb = d.textbbox((0, 0), text, font=f)
    w = bb[2] - bb[0]; x = (1280 - w) / 2
    d.rectangle([x - 18, 622, x + w + 18, 692], fill=(0, 0, 0, 170))
    d.text((x, 638), text, font=f, fill="white")
    img.save(f"/tmp/demo/cap_{name}.png")
card("problem", "Most cricket has no umpire.", ["Club, tape-ball and street matches run on memory.", "Scoring is disputed. Arguments replace decisions.", "Officials cost more than the match itself."])
card("pipeline", "SAM sees. Spark judges. Law decides.", ["SAM 3.1: wicket check on the contact still", "Muse Spark: runs / boundary / wicket verdict as JSON", "MCC geometry in code arbitrates calibrated angles", "Humans correct any ball - corrections become data"])
card("cost", "$0.0029 per ball. $0.69 per match.", ["SAM image $0.0025 + contributor Spark ~$0.0004", "~6 seconds per verdict - inside the between-balls gap", "6/6 verified on a real over. Spend to date: $0.62", "(contributor pricing; ~$1.86/match at Standard)"])
card("roadmap", "What comes next", ["Second phone, side-on: front-foot no-ball proof", "Glasses: the umpire's own point of view", "Auto highlights reel at the final ball"])
card("end", "Pocket Umpire", ["The phone umpires the game nobody officiates.", "Built with SAM 3.1 + Muse Spark (Meta API)", "Footage: credited YouTube sources, linked in repo"])
for n, t in [("hook", "No umpire showed up. The phone did the job."),
             ("over", "One over, called ball by ball: 14/0"),
             ("track", "The ball is 3 pixels. Motion finds it - $0."),
             ("m2", "A second match, daylight: model proposes, human corrects"),
             ("vil", "Daylight village cricket: the wicket concept transfers"),
             ("reel", "The game ends. The highlights are already cut.")]:
    caption(n, t)
print("cards ok")
EOF
# blob-track overlay on b32 frames
/tmp/venv/bin/python - <<'EOF'
import json
from PIL import Image, ImageDraw
tracks = json.load(open("/tmp/blob/b32_tracks.json"))[0]
pts = {int(f): (x, y) for f, x, y in tracks}
for i in range(1, 106):
    img = Image.open(f"/tmp/blob/b32_f{i:03d}.png").convert("RGB")
    d = ImageDraw.Draw(img)
    past = [(x, y) for f, (x, y) in sorted(pts.items()) if f <= i]
    if len(past) > 1: d.line(past, fill=(255, 60, 60), width=3)
    for x, y in past: d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=(255, 60, 60))
    img.save(f"/tmp/demo/trk_{i:03d}.png")
print("track frames ok")
EOF
ffmpeg -y -v error -framerate 15 -i /tmp/demo/trk_%03d.png -i /tmp/blob/cap_x.png -filter_complex "[0:v][1:v]overlay=0:0:format=auto" -c:v libx264 -pix_fmt yuv420p -an /tmp/demo/seg_track.mp4 2>/dev/null || \
ffmpeg -y -v error -framerate 15 -i /tmp/demo/trk_%03d.png -c:v libx264 -pix_fmt yuv420p -an /tmp/demo/seg_track.mp4
norm () { # in, cap-or-card, dur, out
  if [ "$2" != "none" ]; then OV="-i $2 -filter_complex [0:v][1:v]overlay=0:0:format=auto,scale=1280:720,fps=15"; else OV="-vf scale=1280:720,fps=15"; fi
  ffmpeg -y -v error -i "$1" $OV -t "$3" -c:v libx264 -pix_fmt yuv420p -c:a aac -ar 48000 -ac 2 "$4"
}
still () { # card png, dur, out
  ffmpeg -y -v error -loop 1 -i "$1" -f lavfi -i anullsrc=r=48000:cl=stereo -t "$2" -vf scale=1280:720,fps=15 -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "$3"
}
norm /tmp/cards/b32.mp4 /tmp/demo/cap_hook.png 7 /tmp/demo/s01.mp4
still /tmp/demo/card_problem.png 20 /tmp/demo/s02.mp4
norm /tmp/cards/b32.mp4 /tmp/demo/cap_over.png 6.7 /tmp/demo/s03.mp4
norm /tmp/cards/b112.mp4 none 6.7 /tmp/demo/s04.mp4
norm /tmp/cards/b180.mp4 none 6.7 /tmp/demo/s05.mp4
norm /tmp/cards/b227.mp4 none 6.7 /tmp/demo/s06.mp4
norm /tmp/cards/b333.mp4 none 6.7 /tmp/demo/s07.mp4
norm /tmp/cards/b406.mp4 none 6.7 /tmp/demo/s08.mp4
norm /tmp/demo/seg_track.mp4 /tmp/demo/cap_track.png 7 /tmp/demo/s09.mp4
still /tmp/demo/card_pipeline.png 18 /tmp/demo/s10.mp4
norm /tmp/m2clips/m2b02.mp4 /tmp/demo/cap_m2.png 7 /tmp/demo/s11.mp4
norm /tmp/m2clips/m2b05.mp4 none 7 /tmp/demo/s11b.mp4
if [ -f $SHOT ]; then still $SHOT 14 /tmp/demo/s12.mp4; else still /tmp/demo/card_pipeline.png 14 /tmp/demo/s12.mp4; fi
norm /tmp/vil1.mp4 /tmp/demo/cap_vil.png 7 /tmp/demo/s13.mp4
still /tmp/demo/card_cost.png 18 /tmp/demo/s14.mp4
norm /tmp/highlights_land.mp4 /tmp/demo/cap_reel.png 12.2 /tmp/demo/s15.mp4
still /tmp/demo/card_roadmap.png 12 /tmp/demo/s16.mp4
still /tmp/demo/card_end.png 10 /tmp/demo/s17.mp4
{ for i in 01 02 03 04 05 06 07 08 09 10 11; do echo "file '/tmp/demo/s$i.mp4'"; done; echo "file '/tmp/demo/s11b.mp4'"; for i in 12 13 14 15 16 17; do echo "file '/tmp/demo/s$i.mp4'"; done; } > /tmp/demo/list.txt
ffmpeg -y -v error -f concat -safe 0 -i /tmp/demo/list.txt -c copy /tmp/demo-3min.mp4
# vertical cut = existing reel
cp /tmp/highlights_vert.mp4 /tmp/demo-vertical.mp4
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 /tmp/demo-3min.mp4
echo DEMO-OK
