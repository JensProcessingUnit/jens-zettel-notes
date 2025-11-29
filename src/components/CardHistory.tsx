import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Trash2, Tag as TagIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Card = Database["public"]["Tables"]["cards"]["Row"] & {
  tags: Array<{ id: string; name: string; color: string }>;
};

type Tag = Database["public"]["Tables"]["tags"]["Row"];

interface CardHistoryProps {
  onCardSelect: (card: Card) => void;
  refreshTrigger: number;
}

export const CardHistory = ({ onCardSelect, refreshTrigger }: CardHistoryProps) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCardsAndTags();
  }, [refreshTrigger]);

  const fetchCardsAndTags = async () => {
    try {
      // Fetch cards with tags
      const { data: cardsData, error: cardsError } = await supabase
        .from("cards")
        .select(`
          *,
          card_tags (
            tags (
              id,
              name,
              color
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (cardsError) throw cardsError;

      // Transform the data to include tags array
      const transformedCards = (cardsData || []).map((card: any) => ({
        ...card,
        tags: card.card_tags?.map((ct: any) => ct.tags).filter(Boolean) || [],
      }));

      setCards(transformedCards);

      // Fetch all tags
      const { data: tagsData, error: tagsError } = await supabase
        .from("tags")
        .select("*")
        .order("name");

      if (tagsError) throw tagsError;
      setTags(tagsData || []);
    } catch (error: any) {
      console.error("Error fetching cards:", error);
      toast.error("Failed to load cards");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from("cards")
        .delete()
        .eq("id", cardId);

      if (error) throw error;

      setCards(cards.filter((c) => c.id !== cardId));
      toast.success("Card deleted");
    } catch (error: any) {
      console.error("Error deleting card:", error);
      toast.error("Failed to delete card");
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const filteredCards = cards.filter((card) => {
    const matchesSearch =
      searchQuery === "" ||
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((tagId) =>
        card.tags.some((cardTag) => cardTag.id === tagId)
      );

    return matchesSearch && matchesTags;
  });

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading your cards...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cards by title or content..."
            className="pl-10 bg-background border-border"
          />
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <TagIcon className="w-3 h-3" />
              Filter:
            </span>
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                className={`cursor-pointer transition-all ${
                  selectedTags.includes(tag.id)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                }`}
                onClick={() => toggleTag(tag.id)}
                style={
                  selectedTags.includes(tag.id)
                    ? { backgroundColor: tag.color, borderColor: tag.color }
                    : {}
                }
              >
                {tag.name}
              </Badge>
            ))}
            {selectedTags.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTags([])}
                className="h-6 px-2 text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Cards List */}
      {filteredCards.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">
            {searchQuery || selectedTags.length > 0
              ? "No cards match your filters"
              : "No saved cards yet"}
          </p>
          <p className="text-sm">
            {searchQuery || selectedTags.length > 0
              ? "Try adjusting your search or filters"
              : "Generate and save your first card to build your knowledge base"}
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {filteredCards.map((card) => (
            <Card
              key={card.id}
              className="bg-card border-border p-4 hover:shadow-card-hover transition-shadow cursor-pointer"
              onClick={() => onCardSelect(card)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif font-semibold text-foreground mb-2 truncate">
                    {card.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {card.content.substring(0, 150)}...
                  </p>
                  {card.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {card.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className="text-xs"
                          style={{
                            borderColor: tag.color,
                            color: tag.color,
                          }}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(card.id);
                  }}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};