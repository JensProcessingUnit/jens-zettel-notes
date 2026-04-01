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

    const systemPrompt = `You are a short-form content trend strategist. Produce a concise, creator-ready daily trend brief for TikTok, Instagram Reels, and YouTube Shorts.

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
- 3 prioritized tests with expected signal and success metric.`;

    console.log("Calling Lovable AI Gateway for trend brief generation");

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
          { role: "user", content: `Generate my daily trend brief and swipe dashboard based on this niche/voice context:\n\n${sourceText}` }
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

    console.log("Trend brief generated successfully");

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
