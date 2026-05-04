# Zettelkasten Card Creator CLI

A command-line interface for generating daily short-form trend briefs for TikTok, Reels, and YouTube Shorts using AI.

## Features

- **Interactive Mode**: Chat-style interface for building your niche/voice context and generating cards
- **Batch Mode**: Generate cards from command-line arguments or input files
- **Card Management**: Save, list, and view previously generated cards
- **Markdown Output**: Cards are saved with metadata in markdown format
- **AI-Powered**: Uses Lovable AI Gateway (Google Gemini 2.5 Flash) for trend analysis

## Installation

### Prerequisites

- Python 3.8+
- A Lovable AI API key

### Setup

1. Install the required dependency:

```bash
pip install requests
```

2. Set your API key as an environment variable:

```bash
export LOVABLE_API_KEY='your-api-key-here'
```

For permanent setup, add the export line to your `~/.bashrc` or `~/.zshrc`.

## Usage

### Interactive Mode (Default)

Run without arguments to start interactive mode:

```bash
python zettel_card_cli.py
```

In interactive mode:
- Type or paste your niche and voice context
- Use `!generate` to create a trend brief
- Use `!save` to save the generated card
- Use `!list` to see recent cards
- Use `!view <n>` to view a specific card
- Use `!help` for help
- Use `!quit` to exit

### Batch Mode

Generate a card from inline text:

```bash
python zettel_card_cli.py --text "niche = fitness coaches for busy moms; voice = calm, direct, data-backed"
```

Generate from a file:

```bash
python zettel_card_cli.py --input-file my_niche.txt
```

Save the generated card:

```bash
python zettel_card_cli.py --text "your niche here" --save
```

Specify a custom filename:

```bash
python zettel_card_cli.py -t "your niche" -s -o my_custom_card.md
```

### Card Management

List recent cards:

```bash
python zettel_card_cli.py --list
```

View a specific card (e.g., card #1):

```bash
python zettel_card_cli.py --view 1
```

## Command Reference

| Flag | Description |
|------|-------------|
| `-i, --interactive` | Run in interactive mode |
| `-t, --text TEXT` | Source text for batch mode |
| `-f, --input-file FILE` | Path to file containing source text |
| `-s, --save` | Save the generated card |
| `-o, --output FILE` | Custom filename for saved card |
| `-l, --list` | List recent cards |
| `-v, --view N` | View card #N |
| `-h, --help` | Show help message |

### Interactive Commands

| Command | Description |
|---------|-------------|
| `!generate` / `!g` | Generate a trend brief |
| `!save` / `!s` | Save the current card |
| `!list` / `!l` | List recent cards |
| `!view <n>` | View card #n |
| `!help` / `!h` | Show help |
| `!quit` / `!q` | Exit the application |

## Output Format

Generated cards follow this structure:

```markdown
# Daily Trend Brief
Date: [today]
Niche: [interpreted from user input]
Voice guardrails: [3 bullets]

## 1) Breakout Pattern Clusters (last 24h style)
[4-6 clusters with hook, shot structure, caption, soundtrack, pacing, CTA]

## 2) Platform Native vs Portable
[TikTok-native, Reels-native, Shorts-native, and portable ideas]

## 3) Original Concepts (no copying)
[3 original concepts with beat-by-beat outlines]

## 4) Swipe-File Dashboard
[Table with patterns, platform fit, effort, risk, takeaways]

## Tomorrow test plan
[3 prioritized tests]
```

## Saved Cards Location

Cards are saved to `~/.zettelkasten_cards/` with timestamps in filenames:

```
~/.zettelkasten_cards/
├── card_20250121_143022.md
├── card_20250121_145611.md
└── ...
```

Each card includes YAML frontmatter with metadata:
- `created_at`: ISO timestamp
- `source_text`: Original input text

## Example Session

```bash
$ export LOVABLE_API_KEY='your-key'
$ python zettel_card_cli.py

============================================================
🔥 ZETTELKASTEN CARD CREATOR - Interactive Mode
============================================================

Commands:
  !generate  - Generate a new trend brief
  !list      - List recent cards
  !view <n>  - View card #n from the list
  !save      - Save the last generated card
  !help      - Show this help message
  !quit      - Exit the application

Enter your niche and voice context below.
Type '!generate' when ready to create your brief.

❯ niche = fitness coaches for busy moms
✓ Added 35 characters to input.

❯ voice = calm, direct, data-backed
✓ Added 32 characters to input.

❯ avoid hype language, use low-pressure CTAs
✓ Added 43 characters to input.

❯ !generate

⏳ Generating your daily trend brief...

============================================================
# Daily Trend Brief
Date: 2025-01-21
Niche: Fitness coaches for busy moms
Voice guardrails:
- Calm and measured tone
- Direct, no-fluff communication
- Data-backed claims only
...
============================================================

✅ Brief generated successfully!
💡 Type '!save' to save this card, or continue editing your input.

❯ !save

✅ Card saved to: /home/user/.zettelkasten_cards/card_20250121_143022.md

❯ !quit

Goodbye! 📚
```

## License

MIT
