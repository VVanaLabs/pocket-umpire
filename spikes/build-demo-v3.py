#!/usr/bin/env python3
"""Demo v3: NO TTS. Natural audio + bold captions + fast cuts."""
import subprocess, pathlib
from PIL import Image, ImageDraw, ImageFont
W,H=1280,720
OUT=pathlib.Path('/tmp/slick3'); OUT.mkdir(exist_ok=True)
FB="/System/Library/Fonts/Supplemental/Arial Bold.ttf"; FR="/System/Library/Fonts/Supplemental/Arial.ttf"
GREEN=(141,255,110); AMBER=(255,215,93); INK=(238,245,238); DIM=(170,190,170); BG=(6,10,6)
def run(*a): subprocess.run(a,check=True)
def dur(f):
    r=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(f)],capture_output=True,text=True); return float(r.stdout.strip())
def caption_png(name, text, color=INK, size=44):
    img=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(img)
    d.rectangle([0,H-118,W,H],fill=(0,0,0,185))
    d.rectangle([0,H-118,10,H],fill=color)
    d.text((34,H-92),text,font=ImageFont.truetype(FB,size),fill=color)
    img.save(OUT/name)
def stamp(name,big,sub,color):
    img=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(img)
    d.rounded_rectangle([872,56,1244,196],radius=18,fill=(5,8,5,210),outline=color,width=3)
    d.text((902,80),big,font=ImageFont.truetype(FB,54),fill=color)
    d.text((904,148),sub,font=ImageFont.truetype(FR,22),fill=INK)
    img.save(OUT/name)
def card(name,title,lines,accent):
    img=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(img)
    d.rectangle([0,0,10,H],fill=accent); y=210
    d.text((70,y),title,font=ImageFont.truetype(FB,58),fill=INK); y+=88
    for l in lines: d.text((70,y),l,font=ImageFont.truetype(FR,29),fill=DIM); y+=46
    img.save(OUT/name)

card('title.png','POCKET UMPIRE',['The AI umpire for matches with no umpire.','One phone video in. Verdicts, scorebook, highlights out.'],GREEN)
card('proof.png','PROOF, NOT PROMISES',['Over 1: 6/6 verified vs hand labels — 14/0','Match 2 (daylight): 8/10 labeled agreement, misses published','Dubai: 6/6 verdicts ·  $0.0029/ball · ~6s per verdict'],AMBER)
card('end.png','Every match deserves an umpire.',['github.com/VVanaLabs/pocket-umpire','SAM 3.1 + Muse Spark · Meta models only','Under $1/match at contributor pricing* · $1.86 Standard'],GREEN)
caption_png('cap_hook.png','NO UMPIRE.  NO SCOREBOOK.  NO PROOF.',AMBER,40)
caption_png('cap_track.png','LISTENS FOR THE BAT CRACK · TRACKS THE BALL ON-DEVICE',GREEN,30)
caption_png('cap_judge.png','TWO STILLS → SAM 3.1 + MUSE SPARK → VERDICT IN ~6s',GREEN,30)
caption_png('cap_m2.png','MATCH 2 · DAYLIGHT · 8/10 LABELED AGREEMENT',AMBER,32)
caption_png('cap_dubai.png','VENUE 3 · DUBAI · 6/6 VERDICTS RETURNED',AMBER,32)
caption_png('cap_fly.png','HUMANS CORRECT ANY BALL · CORRECTIONS BECOME DATA',GREEN,29)

balls=[('b1.mp4','SIX!','Ball 1 · 6/0',AMBER),('b2.mp4','2 RUNS','Ball 2 · 8/0',GREEN),('b3.mp4','DOT','Ball 3 · 8/0',(190,200,190)),('b4.mp4','SIX!','Ball 4 · 14/0',AMBER),('b5.mp4','DOT','Ball 5 · 14/0',(190,200,190)),('b6.mp4','DOT','Ball 6 · 14/0',(190,200,190))]
for i,(_,big,sub,c) in enumerate(balls): stamp(f'st{i}.png',big,sub,c)

segs=[]
def seg(name,src,start,length,overlay=None,audio_vol=1.0):
    out=OUT/f's{name}.mp4'; args=['ffmpeg','-loglevel','error','-y','-ss',str(start),'-i',str(src)]
    if overlay: args+=['-i',str(OUT/overlay)]
    fc="[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,fps=30,trim=0:%s,setpts=PTS-STARTPTS[v0];"%length
    fc+=("[v0][1:v]overlay=0:0[v];" if overlay else "[v0]null[v];")
    has_a=subprocess.run(['ffprobe','-v','error','-select_streams','a','-show_entries','stream=index','-of','csv=p=0',str(src)],capture_output=True,text=True).stdout.strip()
    if has_a: fc+=f"[0:a]atrim=0:{length},asetpts=PTS-STARTPTS,volume={audio_vol}[a]"
    else: fc+=f"anullsrc=r=48000:cl=stereo,atrim=0:{length}[a]"
    args+=['-filter_complex',fc,'-map','[v]','-map','[a]','-t',str(length),'-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-ar','48000',str(out)]
    run(*args); segs.append(out)
def segcard(name,png,length):
    out=OUT/f's{name}.mp4'
    run('ffmpeg','-loglevel','error','-y','-loop','1','-i',str(OUT/png),'-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-t',str(length),'-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-shortest',str(out)); segs.append(out)

seg('hook','/tmp/dubai-s3/clips/d1b06.mp4',1.2,3.2,'cap_hook.png',1.0)
segcard('title','title.png',3.0)
for i,(f,_,_,_) in enumerate(balls): seg(f'ball{i}','/tmp/cleanballs/'+f,2.5,2.3,f'st{i}.png',0.9)
seg('track','/tmp/demo/seg_track.mp4',0,5.5,'cap_track.png',0.0)
# judge: reuse ball 4 swing slow-ish normal with caption (no stamp)
seg('judge','/tmp/cleanballs/b4.mp4',2.5,4.0,'cap_judge.png',0.7)
seg('match2','/tmp/m2clips/m2b02.mp4',0.5,4.5,'cap_m2.png',0.8)
seg('dubai','/tmp/dubai-s3/clips/d1b01.mp4',1.0,4.0,'cap_dubai.png',0.8)
segcard('proof','proof.png',5.0)
seg('fly','/tmp/vil1.mp4',1.0,4.5,'cap_fly.png',0.5)
segcard('end','end.png',4.5)

lst=OUT/'list.txt'; lst.write_text(''.join(f"file '{p}'\n" for p in segs))
run('ffmpeg','-loglevel','error','-y','-f','concat','-safe','0','-i',str(lst),'-af','loudnorm=I=-15:TP=-1.5','-c:v','copy','-c:a','aac','-b:a','160k','/tmp/pocket-umpire-demo-v3.mp4')
print('total',dur('/tmp/pocket-umpire-demo-v3.mp4'))
