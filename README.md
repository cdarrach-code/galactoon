# Galactic Toon Studio

Turn a photograph into a **classic hand-drawn 2D** galactic cartoon character.

The animation aesthetic is permanently locked (`classic2d-v2`). Users customize the character (sword, stance, expression, background, framing) — never the illustration style.

## Features

- **Locked Classic 2D style profile** — centralized `Classic2DStyleProfile` with fixed style instructions that user settings cannot override
- **Master style reference** — `assets/style-references/classic-2d-master.png` sent with every OpenAI Images Edit request
- **Identity vs style separation** — user photo = identity (Image 1); master reference = artistic treatment only (Image 2)
- **Admin reference replacement** — replace the master PNG via `/admin` without code changes
- **Developer comparison mode** — `/compare` generates multiple characters to inspect style consistency
- **Metadata versioning** — every result stores `styleVersion: classic2d-v2` with the generation

## Run locally

```bash
npm install
cp .env.example .env.local   # optional: add OPENAI_API_KEY
npm run dev
```

Open [http://127.0.0.1:4321](http://127.0.0.1:4321).

Without `OPENAI_API_KEY`, generation returns a mock preview so the UI stays usable.

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
OpenAI Images Edit (gpt-image-1.5, input_fidelity=high)
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
