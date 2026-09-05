import { getSupabaseServerClient, isSupabaseConfigured, DbBlueprintHistory } from '@/lib/supabase';

export interface CreateBlueprintHistoryInput {
  userId?: string;
  userEmail?: string;
  projectName: string;
  title?: string;
  summary?: string;
  totalFindings?: number;
  criticalCount?: number;
  highCount?: number;
  mediumCount?: number;
  blueprintMarkdown: string;
  patchContent?: string;
  metadata?: Record<string, any>;
}

// Armazenamento em memória para fallback/desenvolvimento caso o Supabase não esteja conectado
const localFallbackHistory: DbBlueprintHistory[] = [];
const MAX_BLUEPRINTS_LIMIT = 5;

export class BlueprintHistoryService {
  /**
   * Salva um novo blueprint no histórico e garante que apenas os últimos 5 sejam mantidos
   */
  async saveBlueprint(input: CreateBlueprintHistoryInput): Promise<DbBlueprintHistory> {
    const now = new Date().toISOString();
    const cleanProjectName = input.projectName || 'Projecto';
    const cleanTitle = input.title || `Blueprint de Segurança - ${cleanProjectName}`;
    const cleanEmail = input.userEmail?.toLowerCase().trim();

    const newItem: DbBlueprintHistory = {
      id: `bp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      user_id: input.userId,
      user_email: cleanEmail,
      project_name: cleanProjectName,
      title: cleanTitle,
      version_number: 1,
      summary: input.summary || 'Remediação gerada por IA com regras de segurança',
      total_findings: input.totalFindings ?? 0,
      critical_count: input.criticalCount ?? 0,
      high_count: input.highCount ?? 0,
      medium_count: input.mediumCount ?? 0,
      blueprint_markdown: input.blueprintMarkdown,
      patch_content: input.patchContent,
      metadata: input.metadata || {},
      created_at: now,
      updated_at: now,
    };

    // 1. Tentar salvar no Supabase (se configurado)
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('blueprint_history')
            .insert({
              user_id: input.userId || null,
              user_email: cleanEmail || null,
              project_name: cleanProjectName,
              title: cleanTitle,
              summary: newItem.summary,
              total_findings: newItem.total_findings,
              critical_count: newItem.critical_count,
              high_count: newItem.high_count,
              medium_count: newItem.medium_count,
              blueprint_markdown: newItem.blueprint_markdown,
              patch_content: newItem.patch_content || null,
              metadata: newItem.metadata
            })
            .select()
            .single();

          if (!error && data) {
            console.log(`[Supabase Blueprint] Salvo com sucesso no banco. ID: ${data.id}`);
            // A trigger prune_old_blueprints no Supabase mantém automaticamente os 5 mais recentes!
            return data as DbBlueprintHistory;
          } else {
            console.warn('[Supabase Blueprint] Erro ao inserir no Supabase, usando fallback local:', error?.message);
          }
        } catch (dbErr: any) {
          console.warn('[Supabase Blueprint] Falha de conexão ao salvar:', dbErr.message);
        }
      }
    }

    // 2. Fallback Local em Memória: limita estritamente aos 5 últimos registros
    localFallbackHistory.unshift(newItem);
    if (localFallbackHistory.length > MAX_BLUEPRINTS_LIMIT) {
      localFallbackHistory.splice(MAX_BLUEPRINTS_LIMIT);
    }

    return newItem;
  }

  /**
   * Obtém os últimos 5 blueprints salvos para o usuário ou projeto
   */
  async getRecentBlueprints(userEmail?: string, userId?: string, projectName?: string): Promise<DbBlueprintHistory[]> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        try {
          let query = supabase
            .from('blueprint_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(MAX_BLUEPRINTS_LIMIT);

          if (userId) {
            query = query.eq('user_id', userId);
          } else if (userEmail) {
            query = query.eq('user_email', userEmail.toLowerCase().trim());
          } else if (projectName) {
            query = query.eq('project_name', projectName);
          }

          const { data, error } = await query;
          if (!error && data && data.length > 0) {
            return data as DbBlueprintHistory[];
          }
        } catch (dbErr: any) {
          console.warn('[Supabase Blueprint] Falha ao consultar histórico:', dbErr.message);
        }
      }
    }

    // Fallback: Filtrar em memória e retornar no máximo 5 itens
    const filtered = localFallbackHistory.filter((item) => {
      if (userEmail && item.user_email) {
        return item.user_email === userEmail.toLowerCase().trim();
      }
      if (projectName && item.project_name) {
        return item.project_name === projectName;
      }
      return true;
    });

    return filtered.slice(0, MAX_BLUEPRINTS_LIMIT);
  }

  /**
   * Recupera um blueprint específico por ID
   */
  async getBlueprintById(id: string): Promise<DbBlueprintHistory | null> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('blueprint_history')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (!error && data) {
            return data as DbBlueprintHistory;
          }
        } catch (dbErr: any) {
          console.warn('[Supabase Blueprint] Falha ao buscar por ID:', dbErr.message);
        }
      }
    }

    return localFallbackHistory.find((item) => item.id === id) || null;
  }

  /**
   * Remove um blueprint do histórico
   */
  async deleteBlueprint(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        try {
          await supabase.from('blueprint_history').delete().eq('id', id);
        } catch (dbErr: any) {
          console.warn('[Supabase Blueprint] Falha ao deletar:', dbErr.message);
        }
      }
    }

    const index = localFallbackHistory.findIndex((item) => item.id === id);
    if (index !== -1) {
      localFallbackHistory.splice(index, 1);
      return true;
    }
    return false;
  }
}

export const blueprintHistoryService = new BlueprintHistoryService();
