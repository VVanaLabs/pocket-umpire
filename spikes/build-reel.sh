#!/bin/bash
# Highlights reel v2: Pillow-rendered caption PNGs overlaid with ffmpeg (no drawtext in this build).
set -e
/tmp/venv/bin/python - <<'EOF'
from PIL import Image, ImageDraw, ImageFont
def cap(path, big, small):
    img = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    fb = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
    fr = "/System/Library/Fonts/Supplemental/Arial.ttf"
    f1 = ImageFont.truetype(fb, 76); f2 = ImageFont.truetype(fr, 34)
    for f, t, y in [(f1, big, 60), (f2, small, 630)]:
        bb = d.textbbox((0, 0), t, font=f)
        x = (1280 - (bb[2] - bb[0])) / 2
        d.text((x, y), t, font=f, fill="white", stroke_width=3, stroke_fill="black")
    img.save(path)
cap("/tmp/cap_b32.png", "SIX!  (Ball 1)", "Pocket Umpire  |  OVER 1  |  6/0")
cap("/tmp/cap_b112.png", "2 RUNS  (Ball 2)", "Pocket Umpire  |  OVER 1  |  8/0")
cap("/tmp/cap_b227.png", "SIX!  (Ball 4)", "Pocket Umpire  |  OVER 1  |  14/0")
end = Image.new("RGBA", (1280, 720), (0, 0, 0, 255))
d = ImageDraw.Draw(end)
f1 = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 64)
f2 = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 30)
for f, t, y in [(f1, "14/0 OFF THE OVER", 300), (f2, "AI-umpired for cents  |  full video in bio", 400)]:
    bb = d.textbbox((0, 0), t, font=f)
    d.text(((1280 - (bb[2] - bb[0])) / 2, y), t, font=f, fill="white")
end.save("/tmp/cap_end.png")
print("captions ok")
EOF
Seg () {
  ffmpeg -y -v error -ss 3 -i /tmp/balls/$1.mp4 -t 4 -i /tmp/cap_$1.png \
   -filter_complex "[0:v][1:v]overlay=0:0:format=auto" \
   -c:v libx264 -pix_fmt yuv420p -c:a aac /tmp/seg_$1.mp4
}
Seg b32; Seg b112; Seg b227
ffmpeg -y -v error -loop 1 -i /tmp/cap_end.png -t 2 -c:v libx264 -pix_fmt yuv420p /tmp/seg_end.mp4
printf "file '/tmp/seg_b32.mp4'\nfile '/tmp/seg_b112.mp4'\nfile '/tmp/seg_b227.mp4'\nfile '/tmp/seg_end.mp4'\n" > /tmp/reel.txt
ffmpeg -y -v error -f concat -safe 0 -i /tmp/reel.txt -c copy /tmp/highlights_land.mp4
ffmpeg -y -v error -i /tmp/highlights_land.mp4 -vf "split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=50[bg];[b]scale=1080:-1[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2" -c:v libx264 -pix_fmt yuv420p -c:a aac /tmp/highlights_vert.mp4
ffprobe -v error -show_entries format=duration,size -of default=noprint_wrappers=1 /tmp/highlights_vert.mp4
ffmpeg -y -v error -ss 1 -i /tmp/highlights_vert.mp4 -frames:v 1 /tmp/reel-check.jpg
echo BUILD-OK
