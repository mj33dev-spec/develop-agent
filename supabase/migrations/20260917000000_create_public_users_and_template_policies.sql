-- 1. public.users 테이블 생성
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    raw_user_meta_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- public.users RLS 설정
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read for users" ON public.users;
CREATE POLICY "Allow authenticated read for users" ON public.users
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow individual update for users" ON public.users;
CREATE POLICY "Allow individual update for users" ON public.users
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 2. 트리거 함수 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.users (id, email, raw_user_meta_data, created_at, updated_at)
    VALUES (new.id, new.email, new.raw_user_meta_data, new.created_at, new.created_at)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        raw_user_meta_data = EXCLUDED.raw_user_meta_data,
        updated_at = now();
    RETURN NEW;
END;
$$;

-- 트리거 바인딩
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 기존 가입 데이터 동기화
INSERT INTO public.users (id, email, raw_user_meta_data, created_at, updated_at)
SELECT id, email, raw_user_meta_data, created_at, created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 3. templates 및 template_files RLS 정책 설정
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own templates" ON public.templates;
DROP POLICY IF EXISTS "Allow all users to read templates" ON public.templates;
DROP POLICY IF EXISTS "Users can insert their own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.templates;

DROP POLICY IF EXISTS "Users can view template files" ON public.template_files;
DROP POLICY IF EXISTS "Allow all users to read template files" ON public.template_files;
DROP POLICY IF EXISTS "Users can insert files for their templates" ON public.template_files;
DROP POLICY IF EXISTS "Users can update files for their templates" ON public.template_files;
DROP POLICY IF EXISTS "Users can delete files for their templates" ON public.template_files;

-- templates RLS
CREATE POLICY "Allow all users to read templates"
    ON public.templates FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert their own templates"
    ON public.templates FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
    ON public.templates FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
    ON public.templates FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- template_files RLS
CREATE POLICY "Allow all users to read template files"
    ON public.template_files FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.templates WHERE templates.id = template_files.template_id
    ));

CREATE POLICY "Users can insert files for their templates"
    ON public.template_files FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.templates WHERE templates.id = template_files.template_id AND templates.user_id = auth.uid()
    ));

CREATE POLICY "Users can update files for their templates"
    ON public.template_files FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.templates WHERE templates.id = template_files.template_id AND templates.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete files for their templates"
    ON public.template_files FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.templates WHERE templates.id = template_files.template_id AND templates.user_id = auth.uid()
    ));
