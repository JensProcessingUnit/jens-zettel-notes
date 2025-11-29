-- Create cards table to store generated Zettelkasten cards
CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tags table for categorization
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#8B4513',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create junction table for card-tag relationships
CREATE TABLE public.card_tags (
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (card_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cards
CREATE POLICY "Users can view their own cards"
  ON public.cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cards"
  ON public.cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cards"
  ON public.cards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cards"
  ON public.cards FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for tags
CREATE POLICY "Users can view their own tags"
  ON public.tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tags"
  ON public.tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags"
  ON public.tags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
  ON public.tags FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for card_tags
CREATE POLICY "Users can view their own card tags"
  ON public.card_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cards
      WHERE cards.id = card_tags.card_id
      AND cards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own card tags"
  ON public.card_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cards
      WHERE cards.id = card_tags.card_id
      AND cards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own card tags"
  ON public.card_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.cards
      WHERE cards.id = card_tags.card_id
      AND cards.user_id = auth.uid()
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for cards table
CREATE TRIGGER update_cards_updated_at
  BEFORE UPDATE ON public.cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_cards_user_id ON public.cards(user_id);
CREATE INDEX idx_cards_created_at ON public.cards(created_at DESC);
CREATE INDEX idx_cards_title ON public.cards USING gin(to_tsvector('english', title));
CREATE INDEX idx_cards_content ON public.cards USING gin(to_tsvector('english', content));
CREATE INDEX idx_tags_user_id ON public.tags(user_id);
CREATE INDEX idx_card_tags_card_id ON public.card_tags(card_id);
CREATE INDEX idx_card_tags_tag_id ON public.card_tags(tag_id);