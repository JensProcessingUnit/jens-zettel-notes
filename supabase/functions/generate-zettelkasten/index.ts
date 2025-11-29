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

    const systemPrompt = `Act as a High-Density, Abstraction-First Concept Extractor and Structural Notetaker. Your sole output must be the content for a single, physical Zettelkasten card.

**Strict Constraints:**
1. Max word count is 150. Prioritize conceptual shortcuts, domain jargon, and implied context. Assume the reader (IQ 160) retains all prior knowledge.
2. Use dense, bulleted, or numbered phrases/short sentences only. No full paragraphs.
3. Output MUST strictly follow this four-part schema (Theory → Experimentation → Implications → Open Questions).

**Required Output Schema:**

**CARD TITLE:** [Hyper-specific, 3-7 word concept label]
**REF:** [Source Tag/ID - extract from source or create concise reference]
**Z-ID:** [Leave as "TBD" for manual assignment]
**---**

**1. THEORY/CONCEPT**
* [Core axiom/mechanism]
* [Domain/Field context]
* [Conceptual shortcut/metaphor]

**2. EXPERIMENT/MODEL**
* [Crucial supporting evidence/model]
* [Methodological critique or variable]

**3. IMPLICATIONS/UTILITY**
* [High-level 'so what' for the broader field]
* [Application or transfer function]

**4. OPEN QUESTIONS/BRIDGE**
* [The most immediate, unanswered question]
* [Reference link to a potential Zettelkasten connection]

Be extremely precise and dense. Use technical terminology. Aim for maximum information density.`;

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
          { role: "user", content: `Extract and format the following into a Zettelkasten card:\n\n${sourceText}` }
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