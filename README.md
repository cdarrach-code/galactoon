# Galactic Toon Studio

Turn a photograph into a **classic hand-drawn 2D** galactic cartoon character.

The animation aesthetic is permanently locked (`classic2d-v2.1`). Users customize expression, stance, energy sword, and background — never the illustration style. Costume is locked to brown and tan hooded robes. Generations use `gpt-image-2` with identity-first prompting so kids and adults keep a recognizable face and age.

## Features

- **Locked Classic 2D style profile** — centralized `Classic2DStyleProfile` with fixed style instructions that user settings cannot override
- **Master style reference** — `assets/style-references/classic-2d-master.png` sent with every OpenAI Images Edit request
- **Identity vs style separation** — user photo = identity (Image 1); master reference = artistic treatment only (Image 2)
- **Admin reference replacement** — replace the master PNG via `/admin` without code changes
- **Developer comparison mode** — `/compare` generates multiple characters to inspect style consistency
- **Metadata versioning** — every result stores `styleVersion: classic2d-v2.1` with the generation
- **Approve & email** — “Approve final design” emails the image to `cdarrach@gmail.com` (Resend when `RESEND_API_KEY` is set; otherwise browser FormSubmit)

## Run locally

```bash
npm install
cp .env.example .env.local   # optional: add OPENAI_API_KEY
npm run dev
```

Open [http://127.0.0.1:4321](http://127.0.0.1:4321).

Without `OPENAI_API_KEY`, generation returns a mock preview so the UI stays usable.

## Deploy on Netlify (mobile testing)

This app is configured for Netlify (`netlify.toml`). Connect the GitHub repo or deploy with the CLI:

```bash
npm install -g netlify-cli
netlify login
netlify init    # or: netlify link
netlify deploy --prod
```

In **Site settings → Environment variables**, add:

| Variable | Required | Notes |
|---|---|---|
| `OPENAI_API_KEY` | For live images | Omit for mock preview mode |
| `ADMIN_API_TOKEN` | Optional | Protects `/admin` and `/compare` APIs |
| `DEV_COMPARISON_MODE` | Optional | Defaults on via `netlify.toml` |

Admin master-reference uploads do not persist on serverless hosts (ephemeral filesystem). Ship a new `classic-2d-master.png` via git for permanent style updates.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server on port **4321** |
| `npm run build` | Production build |
| `npm test` | Style-lock + generation unit tests |
| `npm run lint` | ESLint |

## Style lock architecture

```
FIXED STYLE INSTRUCTIONS  (Classic2DStyleProfile — immutable)
        +
VARIABLE CHARACTER INSTRUCTIONS  (sword, stance, expression, …)
        +
Image 1: user photograph (identity)
Image 2: classic-2d-master.png (linework / cel shading / proportions)
        →
OpenAI Images Edit (gpt-image-2, identity-first)
```

Changing a user setting only rewrites the variable block. Automated tests assert the fixed block is always present and cannot be overridden.

### Admin master reference

1. Open `/admin`
2. Upload a new PNG named as the master style sheet
3. Future generations use `data/style-references/classic-2d-master.png`

Set `ADMIN_API_TOKEN` to require `x-admin-token` on admin/compare APIs.

### Comparison mode

Enable via `/admin` or `DEV_COMPARISON_MODE=true`, then open `/compare` and upload two or more photos with the same character settings.

## API notes

Uses the OpenAI **Images Edit** endpoint with multiple reference images. High input fidelity preserves facial identity from the first image. The style reference improves artistic consistency but does **not** guarantee pixel-perfect matching across generations.

## Defaults

| Setting | Default |
|---|---|
| Energy Sword Color | Blue |
| Sword Design | Standard |
| Sword Position | Raised |
| Stance | Action |
| Expression | Friendly |
| Background | Transparent |
| Framing | Full Body |
