-- Create folders table
CREATE TABLE public.folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create rooms table
CREATE TABLE public.rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    "order" INTEGER DEFAULT 0,
    provider TEXT DEFAULT 'gemini',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create messages table
CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    is_user BOOLEAN NOT NULL DEFAULT true,
    text TEXT NOT NULL,
    processed BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create Policies for folders
CREATE POLICY "Users can view their own folders" 
    ON public.folders FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own folders" 
    ON public.folders FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" 
    ON public.folders FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" 
    ON public.folders FOR DELETE 
    USING (auth.uid() = user_id);

-- Create Policies for rooms
CREATE POLICY "Users can view their own rooms" 
    ON public.rooms FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rooms" 
    ON public.rooms FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rooms" 
    ON public.rooms FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rooms" 
    ON public.rooms FOR DELETE 
    USING (auth.uid() = user_id);

-- Create Policies for messages
CREATE POLICY "Users can view messages of their rooms" 
    ON public.messages FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.rooms WHERE rooms.id = messages.room_id AND rooms.user_id = auth.uid()));

CREATE POLICY "Users can insert messages to their rooms" 
    ON public.messages FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM public.rooms WHERE rooms.id = messages.room_id AND rooms.user_id = auth.uid()));

CREATE POLICY "Users can update messages of their rooms" 
    ON public.messages FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM public.rooms WHERE rooms.id = messages.room_id AND rooms.user_id = auth.uid()));

CREATE POLICY "Users can delete messages of their rooms" 
    ON public.messages FOR DELETE 
    USING (EXISTS (SELECT 1 FROM public.rooms WHERE rooms.id = messages.room_id AND rooms.user_id = auth.uid()));
