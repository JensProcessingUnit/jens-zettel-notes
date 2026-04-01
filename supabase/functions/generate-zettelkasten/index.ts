import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceText } = await req.json();
    
    if (!sourceText || typeof sourceText !== 'string') {
      return new Response(
        JSON.stringify({ error: "Source text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a short-form content strategist and trend analyst.

Generate a "Daily Trend Brief + Swipe-File Dashboard" for creators who publish on TikTok, Instagram Reels, and YouTube Shorts.

The user input contains:
- niche
- voice/tone
- optional observations/links/transcripts
- constraints

Rules:
1. Never copy scripts or captions verbatim from referenced creators.
2. If no concrete source examples are provided, clearly mark ideas as "hypotheses" instead of claims.
3. Keep recommendations practical and specific.
4. Prioritize hooks, pacing, platform-native behavior, and CTA strategy.
5. Output in Markdown only using the schema below.

Required output schema:

# Daily Trend Brief (DATE)

## 1) Breakout Pattern Snapshot
- 5-8 bullets with what appears to be breaking out right now in the niche.
- Include confidence tags: [High], [Medium], [Low].

## 2) Cluster Map (Swipe-File Dashboard)
Create a table with these columns:
| Cluster Name | Hook Pattern | Shot Structure | Caption Pattern | Soundtrack Choice | Pacing | CTA | Platforms |

- Add 6-10 rows.
- "Platforms" should be one of:
  - TikTok-native
  - Reels-native
  - Shorts-native
  - Portable (All 3)

## 3) Native vs Portable Insights
### Native to each platform
- TikTok: 2-3 bullets
- Reels: 2-3 bullets
- Shorts: 2-3 bullets

### Portable across all three
- 4-6 bullets on patterns that transfer well.

## 4) Original Concept Studio (No Copying)
Provide exactly 3 concepts that fit the user's voice:
For each concept include:
- Working title
- 1-sentence premise
- 0-3s hook line
- Beat-by-beat shot list (5-8 beats)
- On-screen caption style
- Sound direction
- Editing/pacing notes
- CTA variants (soft + hard)

## 5) Tomorrow's Test Plan
- 3 A/B tests for hooks, pacing, or CTA.
- Include a lightweight scorecard format for tracking outcomes.

Output should feel like a dashboard the user can bookmark daily.`;

    console.log("Calling Lovable AI Gateway for card generation");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create today's daily trend brief and swipe-file dashboard from this input:\n\n${sourceText}` }
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const cardContent = data.choices?.[0]?.message?.content;

    if (!cardContent) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "Failed to generate card content" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Card generated successfully");

    return new Response(
      JSON.stringify({ cardContent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-zettelkasten:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
