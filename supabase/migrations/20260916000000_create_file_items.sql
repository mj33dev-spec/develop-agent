-- Create file_items table
CREATE TABLE IF NOT EXISTS public.file_items (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    extension TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    order_index INTEGER DEFAULT 0,
    size BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.file_items ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for file_items
CREATE POLICY "Users can view their own file_items" 
    ON public.file_items FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own file_items" 
    ON public.file_items FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own file_items" 
    ON public.file_items FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own file_items" 
    ON public.file_items FOR DELETE 
    USING (auth.uid() = user_id);
