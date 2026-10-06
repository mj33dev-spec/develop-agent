-- ========================================================================
-- users 테이블 구독 플랜 컬럼 (plan_tier) 추가 마이그레이션
-- ========================================================================

-- 1. users 테이블에 plan_tier 컬럼 추가 (기본값: 'default' -> 주니어 개발자 무료 플랜)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'default';

-- 2. 기존 유저 데이터 중 NULL인 경우 'default'로 일괄 보정
UPDATE public.users 
SET plan_tier = 'default' 
WHERE plan_tier IS NULL;

-- 3. 컬럼 코멘트 등록
COMMENT ON COLUMN public.users.plan_tier IS '유저 구독 플랜 (default: 무료 주니어 개발자, senior: 유료 시니어 개발자)';
