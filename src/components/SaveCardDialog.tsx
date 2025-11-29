import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Tag = Database["public"]["Tables"]["tags"]["Row"];

interface SaveCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardContent: string;
  sourceText: string;
  onSaved: () => void;
}

export const SaveCardDialog = ({
  open,
  onOpenChange,
  cardContent,
  sourceText,
  onSaved,
}: SaveCardDialogProps) => {
  const [title, setTitle] = useState("");
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTags();
      extractTitle();
    }
  }, [open, cardContent]);

  const extractTitle = () => {
    // Extract title from card content (first line after "CARD TITLE:")
    const match = cardContent.match(/\*\*CARD TITLE:\*\*\s*(.+)/);
    if (match) {
      setTitle(match[1].trim());
    } else {
      setTitle("Untitled Card");
    }
  };

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");

      if (error) throw error;
      setAvailableTags(data || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const colors = [
        "#8B4513",
        "#2C5F2D",
        "#1E3A5F",
        "#5F1E2C",
        "#5F4B1E",
        "#3F1E5F",
      ];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const { data, error } = await supabase
        .from("tags")
        .insert([{ name: newTagName.trim(), color: randomColor, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setAvailableTags([...availableTags, data]);
      setSelectedTags([...selectedTags, data.id]);
      setNewTagName("");
      toast.success("Tag created");
    } catch (error: any) {
      console.error("Error creating tag:", error);
      if (error.message.includes("duplicate")) {
        toast.error("Tag already exists");
      } else {
        toast.error("Failed to create tag");
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert card
      const { data: card, error: cardError } = await supabase
        .from("cards")
        .insert([
          {
            title: title.trim(),
            content: cardContent,
            source_text: sourceText,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (cardError) throw cardError;

      // Insert card-tag relationships
      if (selectedTags.length > 0) {
        const cardTags = selectedTags.map((tagId) => ({
          card_id: card.id,
          tag_id: tagId,
        }));

        const { error: tagsError } = await supabase
          .from("card_tags")
          .insert(cardTags);

        if (tagsError) throw tagsError;
      }

      toast.success("Card saved to your knowledge base");
      onSaved();
      onOpenChange(false);
      
      // Reset form
      setTitle("");
      setSelectedTags([]);
    } catch (error: any) {
      console.error("Error saving card:", error);
      toast.error("Failed to save card");
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Save Card</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter card title"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Tags</label>
            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-background border border-border rounded-md">
              {availableTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                  className="cursor-pointer transition-all"
                  onClick={() => toggleTag(tag.id)}
                  style={
                    selectedTags.includes(tag.id)
                      ? { backgroundColor: tag.color, borderColor: tag.color }
                      : { borderColor: tag.color, color: tag.color }
                  }
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Create New Tag
            </label>
            <div className="flex gap-2">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name"
                className="bg-background border-border"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateTag();
                  }
                }}
              />
              <Button
                onClick={handleCreateTag}
                variant="outline"
                size="sm"
                disabled={!newTagName.trim()}
                className="border-border"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-border"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Card"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};