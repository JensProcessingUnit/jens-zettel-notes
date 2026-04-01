import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Copy, Check, BookOpen, Save, LogOut, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CardHistory } from "@/components/CardHistory";
import { SaveCardDialog } from "@/components/SaveCardDialog";
import type { User, Session } from "@supabase/supabase-js";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [cardContent, setCardContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
        toast.success("Daily trend brief generated");
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

  const handleSaveClick = () => {
    if (!cardContent) {
      toast.error("Generate a card first");
      return;
    }
    setShowSaveDialog(true);
  };

  const handleCardSaved = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleCardSelect = (card: any) => {
    setCardContent(card.content);
    setSourceText(card.source_text);
    setShowHistory(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="w-8 h-8 text-primary" />
                <h1 className="text-4xl font-serif font-semibold text-foreground">
                  Short-Form Trend Brief Generator
                </h1>
              </div>
              <p className="text-muted-foreground text-lg">
                Daily breakout pattern clustering for TikTok, Reels, and Shorts
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowHistory(!showHistory)}
                className="border-border"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                {showHistory ? "Hide" : "Show"} History
              </Button>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="border-border"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Input Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-semibold text-foreground">
                Brief Input
              </h2>
              <span className="text-sm text-muted-foreground">
                {sourceText.length} characters
              </span>
            </div>
            
            <Card className="bg-card shadow-card border-border p-6">
              <Textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Add your niche, voice, and any recent observations (links, transcripts, creator notes, comments, saves). Example: 'Niche: fitness coaches for busy parents. Voice: direct, witty, no fluff. Sources: ...'."
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
                  Building Brief...
                </>
              ) : (
                "Generate Daily Trend Brief"
              )}
            </Button>
          </div>

          {/* Output Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-semibold text-foreground">
                Trend Brief + Swipe-File
              </h2>
              {cardContent && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveClick}
                    variant="outline"
                    size="sm"
                    className="border-border hover:bg-secondary"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
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
                </div>
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
                    <p className="text-lg">Your daily trend brief will appear here</p>
                    <p className="text-sm">Includes clusters, native vs portable patterns, and 3 original concepts</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Card History Section */}
        {showHistory && (
          <Card className="max-w-7xl mx-auto mt-12 bg-card border-border p-8">
            <h3 className="text-2xl font-serif font-semibold text-foreground mb-6">
              Saved Cards
            </h3>
            <CardHistory
              onCardSelect={handleCardSelect}
              refreshTrigger={refreshTrigger}
            />
          </Card>
        )}

        {/* Info Section */}
        <Card className="max-w-7xl mx-auto mt-12 bg-secondary/50 border-border p-8">
          <h3 className="text-xl font-serif font-semibold text-foreground mb-4">
            What You Get
          </h3>
          <div className="grid md:grid-cols-4 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-primary mb-2">1. Breakout Snapshot</h4>
              <p className="text-muted-foreground">Fast read on what is surging in your niche right now</p>
            </div>
            <div>
              <h4 className="font-semibold text-accent mb-2">2. Cluster Dashboard</h4>
              <p className="text-muted-foreground">Hooks, shots, captions, soundtrack, pacing, CTA, platform fit</p>
            </div>
            <div>
              <h4 className="font-semibold text-primary mb-2">3. Platform Strategy</h4>
              <p className="text-muted-foreground">Native platform ideas vs portable cross-platform plays</p>
            </div>
            <div>
              <h4 className="font-semibold text-accent mb-2">4. Original Concepts</h4>
              <p className="text-muted-foreground">Three fresh concepts matched to your tone, plus next tests</p>
            </div>
          </div>
        </Card>
      </main>

      {/* Save Dialog */}
      <SaveCardDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        cardContent={cardContent}
        sourceText={sourceText}
        onSaved={handleCardSaved}
      />
    </div>
  );
};

export default Index;
