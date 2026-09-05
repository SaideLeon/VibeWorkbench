# Configuração do Banco de Dados Supabase (Mitigar IA)

Este diretório contém o esquema SQL completo para o **Supabase (PostgreSQL)**, incluindo autenticação, perfis, controle de recorrência da Cakto, auditorias e **histórico automático dos últimos 5 Blueprints gerados**.

---

## 📁 Estrutura de Arquivos

- `schema.sql`: Script SQL DDL e DML pronto para execução no **SQL Editor do Supabase**.
- `migrations/20260905_initial_schema.sql`: Migration compatível com Supabase CLI.

---

## 🗄️ Tabelas Criadas

1. **`profiles`**: Perfis vinculados ao `auth.users` do Supabase.
2. **`subscriptions`**: Assinaturas e recorrência (Cakto, Pix Automático, Cartão).
3. **`audits`**: Sessões de auditoria com pontuação global e métricas.
4. **`audit_findings`**: Vulnerabilidades detectadas detalhadas.
5. **`blueprint_history`**: **Histórico dos últimos 5 Blueprints gerados**.

---

## 🛡️ Regra Especial: Histórico dos Últimos 5 Blueprints

Conforme especificado, o banco de dados possui um **Trigger e Função PostgreSQL** (`prune_old_blueprints`) acionado automaticamente após qualquer inserção (`AFTER INSERT`):

```sql
CREATE TRIGGER trigger_prune_old_blueprints
AFTER INSERT ON public.blueprint_history
FOR EACH ROW
EXECUTE FUNCTION public.prune_old_blueprints();
```

### Como funciona:
- Sempre que um 6º Blueprint é gerado para o usuário ou projeto, o registro mais antigo é expurgado automaticamente via `OFFSET 5`.
- Garante retenção enxuta, alta performance e recuperação garantida dos últimos 5 Blueprints diretamente pela interface do sistema.

---

## 🚀 Como Aplicar no Supabase

1. Abra o painel do seu projeto no **[Supabase](https://supabase.com)**.
2. No menu lateral esquerdo, vá em **SQL Editor**.
3. Clique em **+ New query**.
4. Copie todo o conteúdo do arquivo `supabase/schema.sql` e cole no editor.
5. Clique em **Run** (ou `Ctrl + Enter`).
6. Todas as tabelas, índices, triggers e políticas RLS serão provisionadas em segundos!

---

## 🔑 Variáveis de Ambiente (.env)

No arquivo `.env.local` da aplicação:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-publica
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-secreta
```
