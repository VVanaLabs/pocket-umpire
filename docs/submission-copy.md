# Submission form copy — final (paste-ready, Nov 4)

Aligned to README + pitch page after council review (2026-11-01). Do not
edit claims here without updating README/site to match.

- **Title:** Pocket Umpire — AI umpire for the games nobody officiates
- **Tagline (≤140c):** SAM 3.1 sees it, Muse Spark calls it — one phone umpires club cricket for under $1 a match.*
- **Track / theme:** Indie · Build for Your World / Push the Frontier

## Description

Most cricket on Earth is played without officials: club, tape-ball and
street matches where scoring is memory and disputes settle arguments, not
matches. Pocket Umpire turns one phone video into a ball-by-ball scorebook,
verdict cards, and shareable highlights.

How it works: an on-device edge layer (audio onset + motion-blob tracking,
$0) segments each ball and selects contact/end stills — only ~60KB of
stills ever leave the device. SAM 3.1 checks the stumps, Muse Spark judges
the outcome from two stills + audio-crack SNR, MCC Laws geometry decides
where a calibrated angle exists, and a human can correct any ball in the
annotation dashboard. The corrections become the dataset.

Verified proof: 6/6 on a real night tape-ball over (runs + not-bowled vs
hand labels, score 14/0), reproduced by three pipeline runs over the same
6 balls (v1, v2, edge-selected), at ≈$0.0029/ball in ≈6s. Cross-footage:
`wicket` concept tracks 105/105 (behind-bowler) and 68/105 (side-on) on
daylight village cricket. Honest scope: verdicts are perceptual from a
single behind-stumps angle; wide/no-ball geometry is built and
unit-tested synthetically and awaits a calibrated side angle on real
footage. A second, daylight match is scored end-to-end as model-proposed
output, corrected by humans in the dashboard — that loop is the product.

*Under $1 per 240-ball match at Muse Spark contributor pricing
(≈$0.69 measured); ≈$1.86 at Standard pricing. Contributor mode trains on
submitted content, so it is opt-in. Full ledger: docs/cost.md.

Meta models only, via api.meta.ai. Total hackathon spend ≈ $0.62.
Roadmap: second (side-on) angle for front-foot no-ball proof, Meta AI
glasses umpire POV, auto highlights.

- **Repo:** https://github.com/VVanaLabs/pocket-umpire
- **Demo video:** https://github.com/VVanaLabs/pocket-umpire/releases/tag/v0.1-demo
- **Live pitch:** https://vvanalabs.github.io/pocket-umpire/
- **Dashboard:** https://vvanalabs.github.io/pocket-umpire/dashboard.html

## Video end-card line (if re-rendered)

> Pocket Umpire — SAM 3.1 + Muse Spark · 6/6 verified over · <$1/match*
> *contributor pricing; $1.86 Standard · github.com/VVanaLabs/pocket-umpire
