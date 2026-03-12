# Reflection Training Webapp

Static web app for counselor reflection training with OpenRouter.

## Features

- Topic-based simulated client prompt generation.
- Trainee response entry and LLM-based reflection evaluation.
- Four clearly separated feedback parts:
  - Score from 0-1
  - Evidence slices from client + trainee text
  - Rubric explanation
  - Next-step coaching + suggested improved response

## Topics Included

- Depression/anxiety
- Fitness/diet - cautionary note
- Substance use
- Vaccination
- Domestic violence
- Epidemic
- Body image acceptance
- Intuitive eating/healthy diet (no shaming)
- Loneliness
- Sexual health/education
- Transition to college

## Run Locally

From this folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## OpenRouter Setup

1. Keep your key in `openrouter.txt` locally (or paste it manually in the app).
2. Use `openrouter.example.txt` as a safe template for repo sharing.
3. In the app, either:
   - paste API key + model, or
   - use the file picker to load `openrouter.txt`.
4. The app can store key/model in browser localStorage if enabled.

## GitHub Pages Deployment

1. Push this folder into your repository.
2. Ensure sensitive files with real API keys are not committed.
3. In GitHub repo settings:
   - `Settings` -> `Pages`
   - Source: deploy from branch (for example `main`)
   - Folder: `/root` or `/docs` depending on your structure
4. Open your Pages URL and use runtime key entry in the UI.

## Security Note

Do not hardcode real OpenRouter API keys into committed JavaScript/HTML.
