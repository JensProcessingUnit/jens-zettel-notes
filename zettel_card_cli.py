#!/usr/bin/env python3
"""
Zettelkasten Card Creator CLI

A command-line interface for generating daily short-form trend briefs
for TikTok, Reels, and YouTube Shorts using AI.
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

try:
    import requests
except ImportError:
    print("Error: 'requests' library is required.")
    print("Install it with: pip install requests")
    sys.exit(1)


class ZettelkastenCardCreator:
    """CLI-based Zettelkasten card creator for short-form content trends."""

    SYSTEM_PROMPT = """You are a short-form content trend strategist. Produce a concise, creator-ready daily trend brief for TikTok, Instagram Reels, and YouTube Shorts.

Hard rules:
1) Do not copy creators verbatim. No direct imitation scripts.
2) Infer patterns from public breakout content behavior and return practical abstractions.
3) Keep it structured, skimmable, and actionable.
4) Respect the user's niche + voice from the input.

Return markdown using this exact schema:

# Daily Trend Brief
Date: [today]
Niche: [interpreted from user input]
Voice guardrails: [3 bullets]

## 1) Breakout Pattern Clusters (last 24h style)
For each cluster include:
- Hook pattern
- Shot structure
- Caption pattern
- Soundtrack choice
- Pacing profile
- CTA style
- Why it is working now

Provide 4-6 clusters.

## 2) Platform Native vs Portable
### TikTok-native ideas
- [idea + why native]
### Reels-native ideas
- [idea + why native]
### Shorts-native ideas
- [idea + why native]
### Portable across all three
- [idea + adaptation notes per platform]

## 3) Original Concepts (no copying)
Create exactly 3 new concepts aligned to the user's voice.
For each concept include:
- Title
- Core premise
- 15-second beat-by-beat outline
- Hook line options (3)
- Caption draft
- CTA options (2)
- Repurposing notes for TikTok/Reels/Shorts

## 4) Swipe-File Dashboard
Create a compact bookmarkable table with columns:
Pattern | Platform fit | Effort (L/M/H) | Risk | Save-worthy takeaway | Next test
Include 8-12 rows.

End with:
## Tomorrow test plan
- 3 prioritized tests with expected signal and success metric."""

    def __init__(self, api_key: str = None):
        """Initialize the card creator.
        
        Args:
            api_key: Lovable AI API key. If None, will look for LOVABLE_API_KEY env var.
        """
        self.api_key = api_key or os.environ.get("LOVABLE_API_KEY")
        self.api_url = "https://ai.gateway.lovable.dev/v1/chat/completions"
        self.cards_dir = Path.home() / ".zettelkasten_cards"
        
        if not self.api_key:
            print("Error: LOVABLE_API_KEY environment variable is not set.")
            print("Please set it with: export LOVABLE_API_KEY='your-api-key'")
            sys.exit(1)
        
        # Ensure cards directory exists
        self.cards_dir.mkdir(parents=True, exist_ok=True)

    def generate_card(self, source_text: str, max_tokens: int = 800, temperature: float = 0.7) -> str:
        """Generate a trend brief card from source text.
        
        Args:
            source_text: The niche and voice context input
            max_tokens: Maximum tokens for the response
            temperature: Sampling temperature
            
        Returns:
            Generated card content as markdown string
        """
        payload = {
            "model": "google/gemini-2.5-flash",
            "messages": [
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": f"Generate my daily trend brief and swipe dashboard based on this niche/voice context:\n\n{source_text}"}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        try:
            response = requests.post(self.api_url, headers=headers, json=payload, timeout=60)
            response.raise_for_status()
            
            data = response.json()
            card_content = data.get("choices", [{}])[0].get("message", {}).get("content")
            
            if not card_content:
                raise ValueError("No content received from AI service")
            
            return card_content
            
        except requests.exceptions.HTTPError as e:
            if response.status_code == 429:
                raise Exception("Rate limit exceeded. Please try again in a moment.")
            elif response.status_code == 402:
                raise Exception("AI credits exhausted. Please add credits to continue.")
            else:
                raise Exception(f"API error: {response.status_code} - {response.text}")
        except requests.exceptions.RequestException as e:
            raise Exception(f"Network error: {str(e)}")

    def save_card(self, content: str, source_text: str, filename: str = None) -> Path:
        """Save a card to the local filesystem.
        
        Args:
            content: The card content
            source_text: The original source text
            filename: Optional custom filename
            
        Returns:
            Path to the saved file
        """
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"card_{timestamp}.md"
        
        filepath = self.cards_dir / filename
        
        # Create metadata header
        metadata = {
            "created_at": datetime.now().isoformat(),
            "source_text": source_text,
        }
        
        full_content = f"---\n{json.dumps(metadata, indent=2)}\n---\n\n{content}"
        
        filepath.write_text(full_content, encoding="utf-8")
        return filepath

    def list_cards(self, limit: int = 10) -> list:
        """List recently saved cards.
        
        Args:
            limit: Maximum number of cards to list
            
        Returns:
            List of card file paths
        """
        cards = sorted(self.cards_dir.glob("card_*.md"), reverse=True)
        return cards[:limit]

    def load_card(self, filename: str) -> tuple:
        """Load a card from file.
        
        Args:
            filename: Name of the card file
            
        Returns:
            Tuple of (metadata, content)
        """
        filepath = self.cards_dir / filename
        
        if not filepath.exists():
            raise FileNotFoundError(f"Card not found: {filename}")
        
        content = filepath.read_text(encoding="utf-8")
        
        # Parse metadata from frontmatter
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                metadata = json.loads(parts[1])
                body = parts[2].strip()
                return metadata, body
        
        return {}, content


def interactive_mode(creator: ZettelkastenCardCreator):
    """Run the CLI in interactive mode."""
    print("\n" + "=" * 60)
    print("🔥 ZETTELKASTEN CARD CREATOR - Interactive Mode")
    print("=" * 60)
    print("\nCommands:")
    print("  !generate  - Generate a new trend brief")
    print("  !list      - List recent cards")
    print("  !view <n>  - View card #n from the list")
    print("  !save      - Save the last generated card")
    print("  !help      - Show this help message")
    print("  !quit      - Exit the application")
    print("\nEnter your niche and voice context below.")
    print("Type '!generate' when ready to create your brief.\n")
    
    current_source = ""
    current_content = ""
    last_cards = []
    
    while True:
        try:
            user_input = input("\n❯ ").strip()
            
            if not user_input:
                continue
            
            if user_input.startswith("!"):
                command = user_input.lower()
                
                if command == "!quit" or command == "!exit" or command == "!q":
                    print("\nGoodbye! 📚")
                    break
                    
                elif command == "!help" or command == "!h":
                    print("\nCommands:")
                    print("  !generate  - Generate a new trend brief")
                    print("  !list      - List recent cards")
                    print("  !view <n>  - View card #n from the list")
                    print("  !save      - Save the last generated card")
                    print("  !help      - Show this help message")
                    print("  !quit      - Exit the application")
                    
                elif command == "!generate" or command == "!g":
                    if not current_source.strip():
                        print("\n⚠️  Please enter your niche and voice context first.")
                        print("   (Paste your text, then type !generate)")
                        continue
                    
                    print("\n⏳ Generating your daily trend brief...")
                    try:
                        content = creator.generate_card(current_source)
                        current_content = content
                        print("\n" + "=" * 60)
                        print(content)
                        print("=" * 60)
                        print("\n✅ Brief generated successfully!")
                        print("💡 Type '!save' to save this card, or continue editing your input.")
                    except Exception as e:
                        print(f"\n❌ Error: {e}")
                        
                elif command == "!save" or command == "!s":
                    if not current_content:
                        print("\n⚠️  No card content to save. Generate a brief first.")
                        continue
                    
                    try:
                        filepath = creator.save_card(current_content, current_source)
                        print(f"\n✅ Card saved to: {filepath}")
                    except Exception as e:
                        print(f"\n❌ Error saving card: {e}")
                        
                elif command == "!list" or command == "!l":
                    cards = creator.list_cards()
                    if not cards:
                        print("\n📭 No saved cards yet.")
                    else:
                        print(f"\n📚 Recent Cards (showing {len(cards)}):")
                        for i, card in enumerate(cards, 1):
                            stat = card.stat()
                            mtime = datetime.fromtimestamp(stat.st_mtime)
                            print(f"  {i}. {card.name} ({mtime.strftime('%Y-%m-%d %H:%M')})")
                            
                elif command.startswith("!view"):
                    parts = command.split()
                    if len(parts) != 2 or not parts[1].isdigit():
                        print("\n⚠️  Usage: !view <number>")
                        continue
                    
                    idx = int(parts[1]) - 1
                    cards = creator.list_cards(limit=20)
                    if idx < 0 or idx >= len(cards):
                        print(f"\n⚠️  Invalid number. Choose 1-{len(cards)}.")
                        continue
                    
                    try:
                        metadata, content = creator.load_card(cards[idx].name)
                        print(f"\n{'=' * 60}")
                        print(f"File: {cards[idx].name}")
                        if metadata.get("created_at"):
                            print(f"Created: {metadata['created_at']}")
                        print(f"{'=' * 60}\n")
                        print(content)
                    except Exception as e:
                        print(f"\n❌ Error loading card: {e}")
                        
                else:
                    print(f"\n⚠️  Unknown command: {command}")
                    print("   Type '!help' for available commands.")
            else:
                # Regular text input - accumulate as source text
                if current_source:
                    current_source += "\n" + user_input
                else:
                    current_source = user_input
                print(f"✓ Added {len(user_input)} characters to input.")
                
        except KeyboardInterrupt:
            print("\n\nInterrupted. Type '!quit' to exit.")
        except EOFError:
            print("\n\nGoodbye! 📚")
            break


def batch_mode(creator: ZettelkastenCardCreator, source_text: str, save: bool = False, output_file: str = None):
    """Run the CLI in batch mode (single generation)."""
    print("⏳ Generating your daily trend brief...")
    
    try:
        content = creator.generate_card(source_text)
        
        print("\n" + "=" * 60)
        print(content)
        print("=" * 60)
        
        if save:
            filepath = creator.save_card(content, source_text, output_file)
            print(f"\n✅ Card saved to: {filepath}")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="🔥 Zettelkasten Card Creator - Generate daily short-form trend briefs",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Interactive mode
  zettel-card --interactive
  
  # Batch mode with file input
  zettel-card --input my_niche.txt --save
  
  # Batch mode with inline text
  zettel-card --text "niche = fitness coaches; voice = calm, data-backed"
  
  # List saved cards
  zettel-card --list
  
  # View a specific card
  zettel-card --view 1

Environment Variables:
  LOVABLE_API_KEY    Your Lovable AI API key (required)
        """
    )
    
    parser.add_argument(
        "-i", "--interactive",
        action="store_true",
        help="Run in interactive mode (default if no other options provided)"
    )
    
    parser.add_argument(
        "-t", "--text",
        type=str,
        help="Source text (niche + voice context) for batch mode"
    )
    
    parser.add_argument(
        "-f", "--input-file",
        type=str,
        help="Path to a file containing source text"
    )
    
    parser.add_argument(
        "-s", "--save",
        action="store_true",
        help="Save the generated card to disk"
    )
    
    parser.add_argument(
        "-o", "--output",
        type=str,
        help="Custom filename for saved card (requires --save)"
    )
    
    parser.add_argument(
        "-l", "--list",
        action="store_true",
        help="List recently saved cards"
    )
    
    parser.add_argument(
        "-v", "--view",
        type=int,
        metavar="N",
        help="View card #N from the recent cards list"
    )
    
    args = parser.parse_args()
    
    # Initialize the creator
    creator = ZettelkastenCardCreator()
    
    # Handle list command
    if args.list:
        cards = creator.list_cards()
        if not cards:
            print("📭 No saved cards yet.")
        else:
            print(f"📚 Recent Cards (showing {len(cards)}):")
            for i, card in enumerate(cards, 1):
                stat = card.stat()
                mtime = datetime.fromtimestamp(stat.st_mtime)
                print(f"  {i}. {card.name} ({mtime.strftime('%Y-%m-%d %H:%M')})")
        return
    
    # Handle view command
    if args.view:
        cards = creator.list_cards(limit=20)
        idx = args.view - 1
        if idx < 0 or idx >= len(cards):
            print(f"⚠️  Invalid number. Choose 1-{len(cards)}.")
            sys.exit(1)
        
        try:
            metadata, content = creator.load_card(cards[idx].name)
            print(f"\n{'=' * 60}")
            print(f"File: {cards[idx].name}")
            if metadata.get("created_at"):
                print(f"Created: {metadata['created_at']}")
            print(f"{'=' * 60}\n")
            print(content)
        except Exception as e:
            print(f"❌ Error loading card: {e}")
            sys.exit(1)
        return
    
    # Determine source text for batch mode
    source_text = None
    
    if args.input_file:
        try:
            source_text = Path(args.input_file).read_text(encoding="utf-8")
        except FileNotFoundError:
            print(f"❌ File not found: {args.input_file}")
            sys.exit(1)
        except Exception as e:
            print(f"❌ Error reading file: {e}")
            sys.exit(1)
    
    if args.text:
        source_text = args.text
    
    # Run batch mode if source text provided
    if source_text:
        batch_mode(creator, source_text, save=args.save, output_file=args.output)
        return
    
    # Default to interactive mode
    interactive_mode(creator)


if __name__ == "__main__":
    main()
