# Publish checklist — Nov 4 (repo stays private until this runs)

Decision 2026-11-01: keep `VVanaLabs/pocket-umpire` private until
submission day. Judges get 404 on every link until step 1–3 are done,
so run this in the morning, submit early afternoon ET (deadline 9 PM ET).

## Morning, Nov 4

- [ ] Site already synced to `gh-pages` on Nov 1 (verify `git diff master:site/index.html origin/gh-pages:index.html` is empty; if site changed since, redo: `git checkout gh-pages && git checkout master -- site && mv site/*.html . && rmdir site && git commit -am 'publish site' && git push && git checkout master`)
- [ ] Make repo public: `gh repo edit VVanaLabs/pocket-umpire --visibility public`
- [ ] Enable Pages on `gh-pages` branch (root): `gh api -X POST repos/VVanaLabs/pocket-umpire/pages -f 'source[branch]=gh-pages' -f 'source[path]=/'` (or Settings → Pages)
- [ ] Logged-out check (private window, no GitHub login):
  - https://vvanalabs.github.io/pocket-umpire/
  - https://github.com/VVanaLabs/pocket-umpire/releases/tag/v0.1-demo (both mp4s download)
  - Repo README renders; every link in it resolves
- [ ] Fresh-clone rehearsal: `git clone` (logged-out URL) → `pnpm install` → `npx tsc --noEmit && npx vitest run` (21 green) → `pnpm cli score-demo` (offline)
- [ ] Secrets scan: `git log --all -p | grep -iE 'meta_api_key=[^.]|sk-[a-z0-9]{20}'` → empty (placeholder `your_key_here` in .env.example is fine)
- [ ] Video: plays end-to-end, captions legible on mute, end card shows pricing caveat (see docs/submission-copy.md)

## Early afternoon, Nov 4

- [ ] Paste form copy from `docs/submission-copy.md`; track = indie
- [ ] Submit; screenshot the confirmation
- [ ] Backups: local copies of both demo mp4s (`/tmp/demo-3min.mp4`, `/tmp/demo-vertical.mp4`) + screenshots of proof numbers
