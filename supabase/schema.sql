-- ==============================================================================
-- MITIGAR IA - ESQUEMA COMPLETO PARA BANCO DE DADOS SUPABASE (PostgreSQL)
-- ==============================================================================
-- Este esquema define as tabelas centrais da aplicação:
-- 1. profiles: Perfis de desenvolvedores e administradores vinculados ao auth.users
-- 2. subscriptions: Gestão de assinaturas e recorrência (Cakto / Pix / Cartão)
-- 3. audits: Registro de auditorias executadas e pontuações de risco
-- 4. audit_findings: Vulnerabilidades identificadas com classificação de severidade
-- 5. blueprint_history: HISTÓRICO DOS ÚLTIMOS 5 BLUEPRINTS GERADOS COM TRIGGER AUTOMÁTICO
-- ==============================================================================

-- 1. Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABELA: profiles (Perfis de Usuários)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'developer' CHECK (role IN ('developer', 'admin', 'auditor')),
    github_username TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Perfis de usuários sincronizados com o Supabase Auth';

-- ==============================================================================
-- 3. TABELA: subscriptions (Assinaturas e Recorrência)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    customer_email TEXT NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    cakto_subscription_id TEXT UNIQUE,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'studio')),
    plan_name TEXT NOT NULL DEFAULT 'Plano Gratuito',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'overdue', 'trialing')),
    frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'annual')),
    payment_method TEXT NOT NULL DEFAULT 'pix_automatico' CHECK (payment_method IN ('pix_automatico', 'credit_card', 'boleto')),
    amount_cents INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'BRL',
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.subscriptions IS 'Assinaturas recorrentes sincronizadas via Webhooks da Cakto';

-- ==============================================================================
-- 4. TABELA: audits (Auditorias de Segurança Executadas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    project_name TEXT NOT NULL,
    repository_url TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed')),
    overall_score INTEGER NOT NULL DEFAULT 0,
    critical_count INTEGER NOT NULL DEFAULT 0,
    high_count INTEGER NOT NULL DEFAULT 0,
    medium_count INTEGER NOT NULL DEFAULT 0,
    low_count INTEGER NOT NULL DEFAULT 0,
    total_files_audited INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.audits IS 'Sessões de auditoria realizadas com contadores de severidade';

-- ==============================================================================
-- 5. TABELA: audit_findings (Vulnerabilidades Detalhadas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
    rule_id TEXT NOT NULL,
    title TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('CRÍTICO', 'ALTO', 'MÉDIO', 'BAIXO', 'INFORMATIVO')),
    file_path TEXT NOT NULL,
    line_number INTEGER,
    code_snippet TEXT,
    description TEXT NOT NULL,
    remediation_status TEXT NOT NULL DEFAULT 'pending' CHECK (remediation_status IN ('pending', 'resolved', 'ignored')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.audit_findings IS 'Achados de segurança específicos de cada auditoria';

-- ==============================================================================
-- 6. TABELA: blueprint_history (Histórico dos Últimos 5 Blueprints Gerados)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.blueprint_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_email TEXT,
    audit_id UUID REFERENCES public.audits(id) ON DELETE SET NULL,
    project_name TEXT NOT NULL,
    title TEXT NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    summary TEXT,
    total_findings INTEGER NOT NULL DEFAULT 0,
    critical_count INTEGER NOT NULL DEFAULT 0,
    high_count INTEGER NOT NULL DEFAULT 0,
    medium_count INTEGER NOT NULL DEFAULT 0,
    blueprint_markdown TEXT NOT NULL,
    patch_content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.blueprint_history IS 'Guarda os últimos 5 Blueprints gerados para recuperação ágil';

-- ==============================================================================
-- 7. TRIGGER & FUNÇÃO: Limitar estritamente aos 5 últimos Blueprints por usuário/projeto
-- ==============================================================================
-- Esta função é acionada após qualquer INSERT na tabela blueprint_history.
-- Ela garante que apenas os 5 blueprints mais recentes sejam mantidos,
-- removendo automaticamente os mais antigos.
CREATE OR REPLACE FUNCTION public.prune_old_blueprints()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o blueprint pertence a um usuário autenticado (user_id):
    IF NEW.user_id IS NOT NULL THEN
        DELETE FROM public.blueprint_history
        WHERE id IN (
            SELECT id FROM public.blueprint_history
            WHERE user_id = NEW.user_id
            ORDER BY created_at DESC
            OFFSET 5
        );
    -- Caso contrário, se foi identificado por e-mail:
    ELSIF NEW.user_email IS NOT NULL THEN
        DELETE FROM public.blueprint_history
        WHERE id IN (
            SELECT id FROM public.blueprint_history
            WHERE user_email = NEW.user_email
            ORDER BY created_at DESC
            OFFSET 5
        );
    -- Fallback: Se for anônimo/sessão sem email, limita por nome do projeto:
    ELSE
        DELETE FROM public.blueprint_history
        WHERE id IN (
            SELECT id FROM public.blueprint_history
            WHERE project_name = NEW.project_name
            ORDER BY created_at DESC
            OFFSET 5
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove o trigger antigo se existir e recria
DROP TRIGGER IF EXISTS trigger_prune_old_blueprints ON public.blueprint_history;
CREATE TRIGGER trigger_prune_old_blueprints
AFTER INSERT ON public.blueprint_history
FOR EACH ROW
EXECUTE FUNCTION public.prune_old_blueprints();

-- ==============================================================================
-- 8. TRIGGER DE ATUALIZAÇÃO AUTOMÁTICA DE updated_at
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER tr_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_blueprint_history_updated_at ON public.blueprint_history;
CREATE TRIGGER tr_blueprint_history_updated_at
BEFORE UPDATE ON public.blueprint_history
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 9. ÍNDICES DE ALTA PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_email ON public.subscriptions(customer_email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_cakto_id ON public.subscriptions(cakto_subscription_id);

CREATE INDEX IF NOT EXISTS idx_audits_user_id ON public.audits(user_id);
CREATE INDEX IF NOT EXISTS idx_audits_created_at ON public.audits(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_findings_audit_id ON public.audit_findings(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_findings_severity ON public.audit_findings(severity);

CREATE INDEX IF NOT EXISTS idx_blueprint_history_user_id ON public.blueprint_history(user_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_history_user_email ON public.blueprint_history(user_email);
CREATE INDEX IF NOT EXISTS idx_blueprint_history_project ON public.blueprint_history(project_name);
CREATE INDEX IF NOT EXISTS idx_blueprint_history_created_at ON public.blueprint_history(created_at DESC);

-- ==============================================================================
-- 10. SEGURANÇA: ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_history ENABLE ROW LEVEL SECURITY;

-- Políticas para Profiles
DROP POLICY IF EXISTS "Usuários podem visualizar o próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem visualizar o próprio perfil"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem atualizar o próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem atualizar o próprio perfil"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Políticas para Subscriptions
DROP POLICY IF EXISTS "Usuários podem consultar suas próprias assinaturas" ON public.subscriptions;
CREATE POLICY "Usuários podem consultar suas próprias assinaturas"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = customer_email);

-- O webhook do servidor (service_role) tem acesso irrestrito para inserção/atualização de assinaturas
DROP POLICY IF EXISTS "Service role gerencia todas as assinaturas" ON public.subscriptions;
CREATE POLICY "Service role gerencia todas as assinaturas"
ON public.subscriptions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Políticas para Audits
DROP POLICY IF EXISTS "Usuários podem gerenciar suas auditorias" ON public.audits;
CREATE POLICY "Usuários podem gerenciar suas auditorias"
ON public.audits FOR ALL
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Políticas para Audit Findings
DROP POLICY IF EXISTS "Acesso aos achados de auditoria" ON public.audit_findings;
CREATE POLICY "Acesso aos achados de auditoria"
ON public.audit_findings FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.audits
        WHERE audits.id = audit_findings.audit_id
        AND (audits.user_id = auth.uid() OR audits.user_id IS NULL)
    )
);

-- Políticas para Blueprint History (Recuperação dos últimos 5)
DROP POLICY IF EXISTS "Usuários podem ler seus 5 blueprints" ON public.blueprint_history;
CREATE POLICY "Usuários podem ler seus 5 blueprints"
ON public.blueprint_history FOR SELECT
USING (
    auth.uid() = user_id 
    OR (auth.jwt() ->> 'email' = user_email)
    OR user_id IS NULL -- Permite recuperação local/anônima por sessão
);

DROP POLICY IF EXISTS "Usuários podem salvar novos blueprints no histórico" ON public.blueprint_history;
CREATE POLICY "Usuários podem salvar novos blueprints no histórico"
ON public.blueprint_history FOR INSERT
WITH CHECK (
    auth.uid() = user_id 
    OR (auth.jwt() ->> 'email' = user_email)
    OR user_id IS NULL
);

DROP POLICY IF EXISTS "Usuários podem remover blueprints do histórico" ON public.blueprint_history;
CREATE POLICY "Usuários podem remover blueprints do histórico"
ON public.blueprint_history FOR DELETE
USING (
    auth.uid() = user_id 
    OR (auth.jwt() ->> 'email' = user_email)
    OR user_id IS NULL
);

-- ==============================================================================
-- 11. FUNÇÃO RPC AUXILIAR: Obter os últimos 5 blueprints de um usuário
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_recent_blueprints(
    p_user_email TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 5
)
RETURNS SETOF public.blueprint_history AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.blueprint_history
    WHERE (p_user_email IS NULL OR user_email = p_user_email OR auth.uid() = user_id)
    ORDER BY created_at DESC
    LIMIT LEAST(p_limit, 5);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
