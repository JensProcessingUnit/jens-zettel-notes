import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Copy, Check, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const [sourceText, setSourceText] = useState("");
  const [cardContent, setCardContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!sourceText.trim()) {
      toast.error("Please enter source material to extract");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-zettelkasten", {
        body: { sourceText },
      });

      if (error) throw error;

      if (data?.cardContent) {
        setCardContent(data.cardContent);
        toast.success("Zettelkasten card generated successfully");
      } else {
        throw new Error("No card content received");
      }
    } catch (error: any) {
      console.error("Error generating card:", error);
      toast.error(error.message || "Failed to generate card");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cardContent);
      setCopied(true);
      toast.success("Card copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-serif font-semibold text-foreground">
              Zettelkasten Card Generator
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            High-density concept extraction for analog knowledge systems
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Input Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-semibold text-foreground">
                Source Material
              </h2>
              <span className="text-sm text-muted-foreground">
                {sourceText.length} characters
              </span>
            </div>
            
            <Card className="bg-card shadow-card border-border p-6">
              <Textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Paste your source text, concept, or abstract here. The AI will extract the core theoretical framework, experimental evidence, implications, and open questions into a structured Zettelkasten card format..."
                className="min-h-[400px] font-sans text-base leading-relaxed resize-none focus-visible:ring-accent"
              />
            </Card>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !sourceText.trim()}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Card...
                </>
              ) : (
                "Extract → Generate Card"
              )}
            </Button>
          </div>

          {/* Output Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-semibold text-foreground">
                Zettelkasten Card
              </h2>
              {cardContent && (
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="sm"
                  className="border-border hover:bg-secondary"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              )}
            </div>

            <Card className="bg-card shadow-card border-border p-6 min-h-[400px]">
              {cardContent ? (
                <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                  {cardContent}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center space-y-2">
                    <BookOpen className="w-12 h-12 mx-auto opacity-40" />
                    <p className="text-lg">Your generated card will appear here</p>
                    <p className="text-sm">Max 150 words · 4-part structure</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Info Section */}
        <Card className="max-w-7xl mx-auto mt-12 bg-secondary/50 border-border p-8">
          <h3 className="text-xl font-serif font-semibold text-foreground mb-4">
            Card Structure
          </h3>
          <div className="grid md:grid-cols-4 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-primary mb-2">1. Theory/Concept</h4>
              <p className="text-muted-foreground">Core axiom, domain context, conceptual shortcuts</p>
            </div>
            <div>
              <h4 className="font-semibold text-accent mb-2">2. Experiment/Model</h4>
              <p className="text-muted-foreground">Supporting evidence, methodological critique</p>
            </div>
            <div>
              <h4 className="font-semibold text-primary mb-2">3. Implications/Utility</h4>
              <p className="text-muted-foreground">High-level impact, transfer functions</p>
            </div>
            <div>
              <h4 className="font-semibold text-accent mb-2">4. Open Questions</h4>
              <p className="text-muted-foreground">Unanswered queries, connection bridges</p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Index;