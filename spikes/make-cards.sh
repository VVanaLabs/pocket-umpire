#!/bin/bash
# Verdict cards: score bug throughout + verdict stamp from contact frame.
set -e
cd /Users/ngs/dev/pocket-umpire
/tmp/venv/bin/python - <<'EOF'
from PIL import Image, ImageDraw, ImageFont
FB = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FR = "/System/Library/Fonts/Supplemental/Arial.ttf"
def text_png(path, big, small, y_big=56):
    img = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    f1 = ImageFont.truetype(FB, 84); f2 = ImageFont.truetype(FR, 34)
    for f, t, y in [(f1, big, y_big), (f2, small, 636)]:
        bb = d.textbbox((0, 0), t, font=f)
        d.text(((1280 - (bb[2] - bb[0])) / 2, y), t, font=f, fill="white", stroke_width=3, stroke_fill="black")
    img.save(path)
bugs = {"b32": "OVER 1  |  BALL 1  |  6/0", "b112": "OVER 1  |  BALL 2  |  8/0",
        "b180": "OVER 1  |  BALL 3  |  8/0", "b227": "OVER 1  |  BALL 4  |  14/0",
        "b333": "OVER 1  |  BALL 5  |  14/0", "b406": "OVER 1  |  BALL 6  |  14/0"}
stamps = {"b32": "SIX!", "b112": "2 RUNS", "b180": "DOT BALL",
          "b227": "SIX!", "b333": "DOT BALL", "b406": "DOT BALL"}
for b, bug in bugs.items():
    text_png(f"/tmp/blob/bug_{b}.png", "", bug)
    text_png(f"/tmp/blob/stamp_{b}.png", stamps[b], "")
print("cards ok")
EOF
mkdir -p /tmp/cards
# ball clip contact-frame verdict
card () {
  ffmpeg -y -v error -i /tmp/balls/$1.mp4 -i /tmp/blob/bug_$1.png -i /tmp/blob/stamp_$1.png \
   -filter_complex "[0:v][1:v]overlay=0:0:format=auto[bg];[bg][2:v]overlay=0:0:format=auto:enable='gte(n,$2)'" \
   -c:v libx264 -pix_fmt yuv420p -c:a aac /tmp/cards/$1.mp4
}
card b32 98; card b112 94; card b180 59; card b227 55; card b333 42; card b406 70
ls -la /tmp/cards/
echo CARDS-OK
# NOTE: this ffmpeg build can't write stills (mjpeg/rawvideo image2 broken);
# verify via: ffmpeg -ss 6.5 -i /tmp/cards/b227.mp4 -frames:v 1 -f rawvideo -pix_fmt rgb24 pipe:1 | python-PIL save
