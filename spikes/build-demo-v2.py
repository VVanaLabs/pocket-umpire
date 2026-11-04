#!/usr/bin/env python3
"""Slick 90s demo: Pillow overlays + macOS TTS VO + ffmpeg assembly. Assets stay in /tmp."""
import subprocess, pathlib, sys
from PIL import Image, ImageDraw, ImageFont

W,H=1280,720
OUT=pathlib.Path('/tmp/slick'); OUT.mkdir(exist_ok=True)
FB="/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FR="/System/Library/Fonts/Supplemental/Arial.ttf"
BG=(6,10,6); GREEN=(141,255,110); AMBER=(255,215,93); INK=(238,245,238); DIM=(165,185,165); CARD=(13,20,13)

def font(p,s): return ImageFont.truetype(p,s)
def card(name, title, lines, accent=GREEN, title_size=54):
    img=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(img)
    d.rectangle([0,0,10,H],fill=accent)
    y=235
    for t,s,c,f in [(title,title_size,INK,FB)]+[(l,30,DIM,FR) for l in lines]:
        d.text((70,y),t,font=font(f,s),fill=c); y+=s+22
    img.save(OUT/name)
def stamp(name, big, sub, color):
    img=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(img)
    d.rounded_rectangle([880,60,1240,190],radius=18,fill=(5,8,5,205),outline=color,width=3)
    d.text((910,82),big,font=font(FB,52),fill=color)
    d.text((912,146),sub,font=font(FR,21),fill=INK)
    # caption bar
    img.save(OUT/name)
def caption(img_path, text):
    img=Image.open(img_path).convert('RGBA'); d=ImageDraw.Draw(img)
    d.rectangle([0,H-64,W,H],fill=(0,0,0,170))
    d.text((28,H-50),text,font=font(FR,25),fill=INK)
    img.save(img_path)

# ---------- cards ----------
card('c_title.png','POCKET UMPIRE',['The AI umpire for cricket matches with no umpire.','One phone video in — verdicts, scorebook, highlights out.'],GREEN,64)
card('c_proof.png','PROOF, NOT PROMISES',['Over 1 (night tape-ball): 6/6 verified vs hand labels — 14/0','Match 2 (daylight): 8/10 labeled balls agree; misses published','Dubai (2nd night venue): 6/6 verdicts, 0 nulls','Cost: $0.0029/ball · ~6s · full ledger in the repo'],AMBER,46)
card('c_end.png','Every match deserves an umpire.',['github.com/VVanaLabs/pocket-umpire','SAM 3.1 + Muse Spark · Meta models only via api.meta.ai','*Under $1/match at contributor pricing (~$0.69/240 balls); $1.86 at Standard.'],GREEN,50)

# ball stamps: verdict + running score
balls=[('b1.mp4','SIX!','Ball 1 · 6/0',AMBER),('b2.mp4','2 RUNS','Ball 2 · 8/0',GREEN),
       ('b3.mp4','DOT','Ball 3 · 8/0',DIM),('b4.mp4','SIX!','Ball 4 · 14/0',AMBER),
       ('b5.mp4','DOT','Ball 5 · 14/0',DIM),('b6.mp4','DOT','Ball 6 · 14/0',DIM)]
for i,(f,big,sub,c) in enumerate(balls): stamp(f'stamp{i}.png',big,sub,c)

# ---------- voiceover ----------
VO=[
 ('hook',"No umpire. No scorebook. No proof."),
 ('title',"Pocket Umpire turns one phone video into an umpire, a scorebook, and highlights — for under a dollar a match."),
 ('over',"One real night over, called ball by ball. Six. Two. Dot. Six. Dot. Dot. Fourteen for none — verified against hand labels, three separate times."),
 ('how',"The phone listens for the bat crack and tracks the ball on-device. Only two stills go to S A M three point one and Muse Spark. A verdict in about six seconds, for a third of a cent."),
 ('proof',"And it travels. Eight of ten labeled balls agreed in a daylight second match. Six of six verdicts at a third venue, in Dubai. Every miss is published — not hidden."),
 ('fly',"Humans can correct any ball, and every correction becomes training data. Next: the umpire's own view, through Meta AI glasses."),
 ('end',"Pocket Umpire. Every match deserves an umpire."),
]
for name,text in VO:
    subprocess.run(['say','-v','Samantha','-r','178','-o',str(OUT/f'vo_{name}.aiff'),text],check=True)
def dur(f):
    r=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(f)],capture_output=True,text=True)
    return float(r.stdout.strip())

def run(*a): subprocess.run(a,check=True)

segs=[]
def seg_footage(name, src, start, vo, overlay=None, keep_audio=0.12):
    d=dur(OUT/f'vo_{vo}.aiff')+0.5
    out=OUT/f'seg_{name}.mp4'
    args=['ffmpeg','-loglevel','error','-y','-ss',str(start),'-i',str(src),'-i',str(OUT/f'vo_{vo}.aiff')]
    if overlay: args+=['-i',str(OUT/overlay)]
    fc=f"[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,fps=30,trim=0:{d},setpts=PTS-STARTPTS[v0];"
    if overlay: fc+="[v0][2:v]overlay=0:0[v];"
    else: fc+="[v0]null[v];"
    has_a=subprocess.run(['ffprobe','-v','error','-select_streams','a','-show_entries','stream=index','-of','csv=p=0',str(src)],capture_output=True,text=True).stdout.strip()
    if has_a and keep_audio>0:
        fc+=f"[0:a]volume={keep_audio}[amb];[1:a]adelay=200|200,volume=1.0[vo];[amb][vo]amix=inputs=2:duration=first[a]"
    else:
        fc+="[1:a]adelay=200|200[a]"
    args+=['-filter_complex',fc,'-map','[v]','-map','[a]','-t',str(d),'-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-ar','48000',str(out)]
    run(*args); segs.append(out); return d
def seg_card(name, png, vo):
    d=dur(OUT/f'vo_{vo}.aiff')+0.6
    out=OUT/f'seg_{name}.mp4'
    run('ffmpeg','-loglevel','error','-y','-loop','1','-i',str(OUT/png),'-i',str(OUT/f'vo_{vo}.aiff'),
        '-filter_complex','[1:a]adelay=150|150[a]','-map','0:v','-map','[a]','-t',str(d),
        '-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-ar','48000',str(out))
    segs.append(out); return d

# hook: six clip, fast
seg_footage('hook','/tmp/cleanballs/b4.mp4',2.5,'hook',None,0.25)
seg_card('title','c_title.png','title')
# over montage: one segment per ball with stamp, sharing 'over' VO split is complex — use per-ball silent + one VO bed:
# simpler: build montage video first (6 x ~2.2s), then lay VO over it
mont=OUT/'montage.mp4'
parts=[]
for i,(f,_,_,_) in enumerate(balls):
    p=OUT/f'm{i}.mp4'
    run('ffmpeg','-loglevel','error','-y','-ss','2.5','-i',f'/tmp/cleanballs/{f}','-i',str(OUT/f'stamp{i}.png'),
        '-filter_complex','[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,fps=30,trim=0:2.2,setpts=PTS-STARTPTS[v0];[v0][1:v]overlay=0:0[v]',
        '-map','[v]','-an','-c:v','libx264','-pix_fmt','yuv420p',str(p))
    parts.append(p)
lst=OUT/'mont.txt'; lst.write_text(''.join(f"file '{p}'\n" for p in parts))
run('ffmpeg','-loglevel','error','-y','-f','concat','-safe','0','-i',str(lst),'-c','copy',str(mont))
d=dur(OUT/'vo_over.aiff')+0.5
out=OUT/'seg_over.mp4'
run('ffmpeg','-loglevel','error','-y','-i',str(mont),'-i',str(OUT/'vo_over.aiff'),
    '-filter_complex','[1:a]adelay=200|200[a]','-map','0:v','-map','[a]','-t',str(max(d,13.2)),
    '-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-ar','48000',str(out))
segs.append(out)
seg_footage('how','/tmp/demo/seg_track.mp4',0,'how',None,0.0)
seg_card('proof','c_proof.png','proof')
seg_footage('fly','/tmp/vil1.mp4',1.0,'fly',None,0.08)
seg_card('end','c_end.png','end')

lst=OUT/'list.txt'; lst.write_text(''.join(f"file '{p}'\n" for p in segs))
run('ffmpeg','-loglevel','error','-y','-f','concat','-safe','0','-i',str(lst),
    '-af','loudnorm=I=-15:TP=-1.5','-c:v','copy','-c:a','aac','-b:a','160k','/tmp/pocket-umpire-demo-v2.mp4')
print('segments:', [p.name for p in segs])
print('total', dur('/tmp/pocket-umpire-demo-v2.mp4'))
