-- ==============================================================================
-- Migration: 20260926000000_cleanup_themes_and_settings.sql
-- Description: 플랫/글래스모피즘 테마를 단일 다크/라이트 모드로 통합하고 
--              users 테이블 및 settings JSONB에서 defaultTheme 정리
-- ==============================================================================

-- 1. settings JSONB 컬럼에서 defaultTheme 속성 제거
UPDATE public.users
SET settings = settings - 'defaultTheme'
WHERE settings ? 'defaultTheme';

-- 2. is_dark_mode 값을 settings 내부의 isDarkMode 값과 동기화 (기존 값 보존)
UPDATE public.users
SET is_dark_mode = COALESCE((settings->>'isDarkMode')::boolean, is_dark_mode, false);

-- 3. settings JSONB 내부의 isDarkMode 필드를 is_dark_mode 컬럼과 일치하도록 최신화
UPDATE public.users
SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{isDarkMode}',
    to_jsonb(COALESCE(is_dark_mode, false))
);

-- 4. default_theme 컬럼 삭제 (더 이상 사용하지 않음)
ALTER TABLE public.users DROP COLUMN IF EXISTS default_theme;
