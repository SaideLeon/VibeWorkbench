// Catálogo de Regras de Segurança
// Fonte: Plataforma de Análise de Segurança de Código (v1.0) + Relatório CTF (v1.0)
// Port tipado de references/ruleset.md — mantido como fonte única de verdade
// (a IA nunca inventa severidade ou pontuação: ambas vêm daqui).

export type Severity = 'CRITICO' | 'ALTO' | 'MEDIO';

export interface SecurityRule {
  id: string;
  severity: Severity;
  category: string;
  name: string;
  description: string;
}

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  CRITICO: 25,
  ALTO: 10,
  MEDIO: 5,
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  CRITICO: '🔴 CRÍTICO',
  ALTO: '🟠 ALTO',
  MEDIO: '🟡 MÉDIO',
};

export const RULESET: SecurityRule[] = [
  // A.1 — Autenticação e Gerenciamento de Credenciais
  { id: 'R01', severity: 'CRITICO', category: 'Autenticação e Credenciais', name: 'Hash de senha moderno', description: 'Senhas devem usar Argon2, bcrypt ou scrypt. MD5 e SHA-1 são proibidos.' },
  { id: 'R02', severity: 'ALTO', category: 'Autenticação e Credenciais', name: 'Sem enumeração de utilizadores', description: 'Resposta de autenticação deve ser sempre genérica ("credenciais inválidas"). Nunca revelar se o e-mail existe.' },
  { id: 'R03a', severity: 'CRITICO', category: 'Autenticação e Credenciais', name: 'Secrets em ficheiros não óbvios', description: 'Secrets vazam frequentemente fora do .env: em .md/README (passos de troubleshooting), ficheiros .json de configuração (ex.: appsettings.json), .txt "de teste", scripts de seed, e até em commits antigos já removidos do HEAD mas ainda presentes no histórico do Git. A auditoria deve inspeccionar todo o repositório, não só ficheiros de configuração óbvios, e verificar o histórico de commits (git log -p) quando disponível.' },
  { id: 'R03b', severity: 'ALTO', category: 'Autenticação e Credenciais', name: 'Reconhecimento de padrões de chave por provedor', description: 'Procurar prefixos característicos que indicam chave potencialmente viva: Google AI / GCP (AIza / novo formato AQ.), Stripe (sk_live_ / sk_test_), AWS (AKIA), Mercado Pago (APP_USR-), Anthropic (sk-ant-), OpenAI (sk- / sk-proj-), URIs de base de dados (mongodb://, mongodb+srv://, postgres://, postgresql://), tokens de bot (Telegram, Discord) e tokens genéricos de alta entropia sem prefixo reconhecível. A presença de qualquer um destes fora de variável de ambiente é CRÍTICO por si só.' },
  { id: 'R03c', severity: 'CRITICO', category: 'Autenticação e Credenciais', name: 'Remediação de secret vazado — rotação obrigatória', description: 'Encontrar e apagar um secret do histórico do Git (via git filter-repo, BFG Repo-Cleaner, ou squash de histórico) não invalida a credencial. Se o repositório foi público em qualquer momento — ou clonado/acedido por terceiros antes da correcção — o secret deve ser tratado como comprometido. Acção obrigatória: (1) revogar/rotacionar a credencial directamente no painel do provedor (Google Cloud Console / Google AI Studio, Stripe, AWS IAM, Mercado Pago, Anthropic, MongoDB Atlas, etc.), (2) só depois reescrever o histórico para remover o rasto, (3) confirmar que a chave antiga retorna erro de autenticação após rotação. Reescrever o histórico sem rotacionar é uma correcção cosmética, não uma correcção de segurança.' },
  { id: 'R04', severity: 'ALTO', category: 'Autenticação e Credenciais', name: 'Não criar autenticação própria', description: 'Usar soluções estabelecidas (Supabase Auth, Auth0, Keycloak, NextAuth). Autenticação manual aumenta superfície de ataque.' },
  { id: 'R05', severity: 'ALTO', category: 'Autenticação e Credenciais', name: 'Revogação de JWT', description: 'Implementar blocklist ou rotação de refresh tokens. Tokens sem revogação são inválidáveis mesmo após comprometimento.' },

  // A.2 — Rate Limiting e Protecção contra Abuso
  { id: 'R06', severity: 'ALTO', category: 'Rate Limiting e Abuso', name: 'Rate limiting por endpoint', description: 'Endpoints de autenticação, OTP e recuperação de senha precisam de limites mais rígidos com lockout progressivo.' },
  { id: 'R07', severity: 'ALTO', category: 'Rate Limiting e Abuso', name: 'Limite de tamanho de input', description: 'Todo campo deve ter validação server-side de tamanho máximo. Validação apenas no front-end é insuficiente.' },
  { id: 'R08', severity: 'CRITICO', category: 'Rate Limiting e Abuso', name: 'Protecção contra Race Condition', description: 'Operações financeiras e contadores devem usar transacções atómicas. Verificação separada da acção é vulnerável.' },

  // A.3 — Validação e Sanitização de Dados
  { id: 'R09', severity: 'CRITICO', category: 'Validação de Dados', name: 'Validação server-side obrigatória', description: 'Toda validação deve existir no servidor. Dados do cliente são sempre suspeitos.' },
  { id: 'R10', severity: 'CRITICO', category: 'Validação de Dados', name: 'Protecção SQL Injection', description: 'Usar queries parametrizadas ou ORM com sanitização. Concatenação directa de input é proibida.' },
  { id: 'R11', severity: 'ALTO', category: 'Validação de Dados', name: 'Protecção XSS', description: 'Conteúdo de utilizador renderizado na interface deve ser escapado/sanitizado.' },
  { id: 'R12', severity: 'ALTO', category: 'Validação de Dados', name: 'Validação de upload (MIME + Magic Bytes)', description: 'Upload deve verificar MIME Type declarado E os Magic Bytes do ficheiro. Extensão sozinha é insuficiente.' },
  { id: 'R13', severity: 'MEDIO', category: 'Validação de Dados', name: 'Restrição de URLs externas em imagens', description: 'Campos de URL de imagem devem restringir ao próprio domínio. URLs externas revelam IPs dos utilizadores.' },
  { id: 'R14', severity: 'MEDIO', category: 'Validação de Dados', name: 'Limite de tamanho de URL', description: 'URLs do próprio domínio ainda precisam de limite de tamanho, incluindo query strings.' },

  // A.4 — Controlo de Acesso e Autorização
  { id: 'R15', severity: 'CRITICO', category: 'Controlo de Acesso', name: 'Protecção IDOR', description: 'Toda operação em recursos deve verificar no back-end se o utilizador tem autorização. Nunca confiar em IDs do cliente.' },
  { id: 'R16', severity: 'ALTO', category: 'Controlo de Acesso', name: 'Regras de acesso explícitas', description: 'Regras de negócio de acesso devem ser explicitamente implementadas (ex.: só compradores acessam conteúdo pago).' },
  { id: 'R17', severity: 'CRITICO', category: 'Controlo de Acesso', name: 'RLS configurado restritivamente', description: 'Em Supabase/PostgreSQL, políticas RLS devem ser restritivas por defeito. RLS permissivo é das falhas mais exploradas.' },
  { id: 'R18', severity: 'ALTO', category: 'Controlo de Acesso', name: 'Protecção Mass Assignment', description: 'API não deve aceitar campos sensíveis (roles, saldo, status de pagamento) no body sem whitelist explícita.' },

  // A.5 — Integridade da Lógica de Negócio
  { id: 'R19', severity: 'CRITICO', category: 'Lógica de Negócio', name: 'Consistência em transacções financeiras', description: 'Operações financeiras exigem transacções ACID. Prevenir exploração por compras/reembolsos simultâneos.' },
  { id: 'R20', severity: 'ALTO', category: 'Lógica de Negócio', name: 'Verificação de pré-condições', description: 'Fluxos de reembolso, saque e cancelamento devem verificar todas as pré-condições antes de executar.' },
  { id: 'R21', severity: 'ALTO', category: 'Lógica de Negócio', name: 'Detecção automática de fraude', description: 'Operações de alto risco não podem depender exclusivamente de revisão humana. Implementar regras automáticas.' },

  // A.6 — Práticas de Desenvolvimento Seguro
  { id: 'R22', severity: 'CRITICO', category: 'Práticas de Desenvolvimento', name: 'Defesa em profundidade', description: 'Cada camada (front-end, API, BD) deve ser independentemente segura. Falha numa camada não deve comprometer as restantes.' },
  { id: 'R23', severity: 'ALTO', category: 'Práticas de Desenvolvimento', name: 'Testes de segurança automatizados', description: 'Testes devem cobrir: acesso não autorizado, Race Condition, inputs maliciosos, bypass de autorização.' },
  { id: 'R24', severity: 'ALTO', category: 'Práticas de Desenvolvimento', name: 'Segurança no prompt (projectos IA)', description: 'Requisitos de segurança devem estar no prompt inicial. Segurança adicionada depois é sempre menos eficaz.' },
  { id: 'R25', severity: 'MEDIO', category: 'Práticas de Desenvolvimento', name: 'IA como atacante', description: 'Usar IA para tentar comprometer o sistema durante o desenvolvimento. Resolve ~80% das vulnerabilidades comuns.' },

  // B.1 — Autenticação e Controlo de Sessão (CTF)
  { id: 'CTF-R01', severity: 'CRITICO', category: 'CTF — Autenticação e Sessão', name: 'Secrets JWT únicos por subsistema', description: 'JWT compartilhado entre subsistemas permite forjar tokens de outros utilizadores. Cada subsistema deve ter o seu secret e escopo de validação.' },
  { id: 'CTF-R02', severity: 'ALTO', category: 'CTF — Autenticação e Sessão', name: 'Unicidade global de username', description: 'Usernames duplicados entre subsistemas + JWT partilhado = account takeover. Usernames devem ser únicos globalmente ou o escopo do token delimitado.' },
  { id: 'CTF-R03', severity: 'CRITICO', category: 'CTF — Autenticação e Sessão', name: 'Secrets distintos por ambiente', description: 'Ambientes de homologação com o mesmo secret JWT de produção permitem geração de tokens válidos para utilizadores reais.' },

  // B.2 — Validação de Dados e Lógica de Negócio (CTF)
  { id: 'CTF-R04', severity: 'CRITICO', category: 'CTF — Validação e Lógica', name: 'Rejeitar valores fracionados onde não permitidos', description: 'Input como 7.5 numa posição de jogo inteiro deve ser rejeitado explicitamente. Comparação falha = vantagem infinita.' },
  { id: 'CTF-R05', severity: 'CRITICO', category: 'CTF — Validação e Lógica', name: 'Lógica de resultado exclusivamente no servidor', description: 'Resultado calculado no front-end (ex.: seed de timestamp) pode ser previsto. Toda lógica determinística deve estar no servidor.' },
  { id: 'CTF-R06', severity: 'CRITICO', category: 'CTF — Validação e Lógica', name: 'Não expor chaves de criptografia no cliente', description: 'Chave de criptografia no JavaScript do cliente equivale a dado em texto claro. Secrets e chaves devem existir apenas no servidor.' },

  // B.3 — Controlo de Taxa e Race Conditions (CTF)
  { id: 'CTF-R07', severity: 'CRITICO', category: 'CTF — Rate Limiting e Race Conditions', name: 'Ler estado DENTRO da Transaction', description: 'Saldo consultado antes do bloco Transaction permite Race Condition: múltiplas requisições lêem saldo positivo antes de qualquer débito.' },
  { id: 'CTF-R08', severity: 'CRITICO', category: 'CTF — Rate Limiting e Race Conditions', name: 'Rate limiting em OTP', description: 'OTP curto sem rate limit permite brute force em segundos. OTP deve ter: min 6 dígitos, limite de tentativas, lockout temporário.' },
  { id: 'CTF-R09', severity: 'ALTO', category: 'CTF — Rate Limiting e Race Conditions', name: 'CAPTCHA e bloqueio por IP em endpoints críticos', description: 'Sem CAPTCHA, ataques de brute force paralelo executam em segundos. Login, OTP e recuperação de senha devem ter CAPTCHA e bloqueio progressivo por IP.' },

  // B.4 — Controlo de Acesso e Obscuridade (CTF)
  { id: 'CTF-R10', severity: 'ALTO', category: 'CTF — Acesso e Obscuridade', name: 'Rotas escondidas não substituem autenticação', description: 'Painéis admin em rotas obscuras podem ser localizados via wordlist. Rotas obscuras podem ser camada extra, mas acesso deve ter MFA robusto.' },
  { id: 'CTF-R11', severity: 'ALTO', category: 'CTF — Acesso e Obscuridade', name: 'Seeds de jogo geradas e validadas no servidor', description: 'Seeds geradas no front-end são previsíveis. Devem ser geradas no servidor, vinculadas à sessão, invalidadas após uso.' },
];

const RULE_MAP = new Map(RULESET.map((r) => [r.id.toUpperCase(), r]));

// Suporte para alias retrocompatível R03 -> R03a
if (!RULE_MAP.has('R03') && RULE_MAP.has('R03A')) {
  RULE_MAP.set('R03', RULE_MAP.get('R03A')!);
}

export function getRuleById(id: string): SecurityRule | undefined {
  if (!id) return undefined;
  return RULE_MAP.get(id.trim().toUpperCase());
}

/** Catálogo formatado como texto compacto para injectar no prompt da IA. */
export function ruleCatalogAsPrompt(): string {
  return RULESET.map(
    (r) => `${r.id} [${r.severity}] ${r.name} — ${r.description}`
  ).join('\n');
}

export const VALID_RULE_IDS = RULESET.map((r) => r.id);
