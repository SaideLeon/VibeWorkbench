import { ScoredFinding } from './scoring';
import { getRuleById } from './ruleset';

export interface SecretPattern {
  name: string;
  provider: string;
  regex: RegExp;
  ruleId: 'R03a' | 'R03b';
  description: (match: string, provider: string) => string;
  isHighEntropy?: boolean;
}

// Padrões de reconhecimento estrito por provedor e tokens (R03b)
export const PROVIDER_PATTERNS: SecretPattern[] = [
  // Google / Google AI (Gemini & GCP) API Key — Suporta formato clássico (AIza...) e o novo formato (AQ....)
  {
    name: 'Google AI / Google Cloud API Key',
    provider: 'Google AI',
    regex: /\b(?:AIza[0-9A-Za-z_-]{35}|AQ\.[0-9a-zA-Z_-]{20,})\b/g,
    ruleId: 'R03b',
    description: (match) => `Chave de API Google / Google AI (${match.startsWith('AQ.') ? 'Novo formato AQ.' : 'Formato AIza'}) exposta fora de variáveis de ambiente.`,
  },
  // AWS Access Key ID
  {
    name: 'AWS Access Key ID',
    provider: 'AWS',
    regex: /\b(AKIA[0-9A-Z]{16})\b/g,
    ruleId: 'R03b',
    description: (match) => `Credencial AWS Access Key ID (${match.slice(0, 8)}...) detectada fora de variáveis de ambiente.`,
  },
  // Stripe Secret & Restricted Keys (Live e Test)
  {
    name: 'Stripe API Secret / Restricted Key',
    provider: 'Stripe',
    regex: /\b(?:sk_live_|sk_test_|rk_live_|rk_test_)[0-9a-zA-Z]{24,}\b/g,
    ruleId: 'R03b',
    description: (match) => `Chave de API Stripe (${match.startsWith('sk_live_') ? 'LIVE — em produção' : match.startsWith('sk_test_') ? 'TEST' : 'RESTRICTED'}) detectada em código fonte.`,
  },
  // Slack API Token (Bot, User, Workspace, App)
  {
    name: 'Slack OAuth / Bot Token',
    provider: 'Slack',
    regex: /\b(xox[p|b|o|a|r|s]-[0-9]{10,13}-[0-9]{10,13}-[0-9a-zA-Z-]{24,34}|xox[baprs]-[0-9a-zA-Z-]{10,32})\b/g,
    ruleId: 'R03b',
    description: () => `Token de autenticação de Slack (xoxp/xoxb/xoxa) exposto no repositório.`,
  },
  // SendGrid API Key
  {
    name: 'SendGrid API Key',
    provider: 'SendGrid',
    regex: /\b(SG\.[\w-]{22}\.[\w-]{43})\b/g,
    ruleId: 'R03b',
    description: () => `Chave de API de envio de e-mails SendGrid (SG....) hardcoded.`,
  },
  // Twilio API Key & Account SID / Auth Token
  {
    name: 'Twilio API Key / Account SID',
    provider: 'Twilio',
    regex: /\b(?:SK[0-9a-fA-F]{32}|AC[0-9a-fA-F]{32})\b/g,
    ruleId: 'R03b',
    description: (match) => `Credencial de autenticação Twilio (${match.startsWith('SK') ? 'API Key' : 'Account SID'}) exposta.`,
  },
  // Mailgun API Key
  {
    name: 'Mailgun API Key',
    provider: 'Mailgun',
    regex: /\b(key-[0-9a-zA-Z]{32})\b/g,
    ruleId: 'R03b',
    description: () => `Chave de API Mailgun (key-...) para envio de e-mails transacionais.`,
  },
  // Heroku API Key
  {
    name: 'Heroku API Key',
    provider: 'Heroku',
    regex: /\b([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\b/g,
    ruleId: 'R03b',
    description: () => `Chave de gerenciamento de infraestrutura Heroku API Key em texto claro.`,
  },
  // Facebook / Meta Access Token
  {
    name: 'Facebook / Meta Access Token',
    provider: 'Facebook',
    regex: /\b(?:[0-9]{13,16}-[0-9a-fA-F]{32}|EAACEdEose0cBA[0-9A-Za-z]+)\b/g,
    ruleId: 'R03b',
    description: () => `Token de acesso / App Secret do Facebook Graph API exposto.`,
  },
  // Firebase API Token / Project Secret
  {
    name: 'Firebase Secret Token',
    provider: 'Firebase',
    regex: /\b([a-zA-Z0-9_-]{7}:[a-zA-Z0-9_-]{40})\b/g,
    ruleId: 'R03b',
    description: () => `Token de credencial privada do Firebase exposto no repositório.`,
  },
  // Mercado Pago Access Token
  {
    name: 'Mercado Pago Access Token',
    provider: 'Mercado Pago',
    regex: /\b(APP_USR-[0-9a-zA-Z_-]{20,})\b/g,
    ruleId: 'R03b',
    description: () => `Access Token de produção do Mercado Pago (APP_USR-...) hardcoded no código.`,
  },
  // Anthropic API Key
  {
    name: 'Anthropic API Key',
    provider: 'Anthropic',
    regex: /\b(sk-ant-[0-9a-zA-Z_-]{20,})\b/g,
    ruleId: 'R03b',
    description: () => `Chave de API Anthropic Claude (sk-ant-...) exposta fora de variáveis de ambiente.`,
  },
  // OpenAI API Key
  {
    name: 'OpenAI API Key',
    provider: 'OpenAI',
    regex: /\b(sk-[a-zA-Z0-9]{32,48}|sk-proj-[a-zA-Z0-9_-]{32,})\b/g,
    ruleId: 'R03b',
    description: () => `Chave de API OpenAI hardcoded fora de variáveis de ambiente.`,
  },
  // Database URIs com credenciais (MongoDB, PostgreSQL, MySQL, Redis)
  {
    name: 'Database Connection URI com Senha',
    provider: 'Database',
    regex: /\b((?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis):\/\/[a-zA-Z0-9_\-\.]+:[^@\s"'`<>]+@[a-zA-Z0-9_\-\.]+[\w\/\.\?\=\&\-\%]*)\b/gi,
    ruleId: 'R03b',
    description: (match) => {
      const scheme = match.split('://')[0];
      return `URI de conexão com base de dados (${scheme}://) contendo utilizador e senha em texto claro.`;
    },
  },
  // Telegram Bot Token
  {
    name: 'Telegram Bot Token',
    provider: 'Telegram',
    regex: /\b([0-9]{8,10}:[a-zA-Z0-9_-]{35})\b/g,
    ruleId: 'R03b',
    description: () => `Token de Bot do Telegram exposto directamente no repositório.`,
  },
  // Discord Bot Token
  {
    name: 'Discord Bot Token',
    provider: 'Discord',
    regex: /\b([MNO][a-zA-Z0-9_-]{23,25}\.[a-zA-Z0-9_-]{6}\.[a-zA-Z0-9_-]{27})\b/g,
    ruleId: 'R03b',
    description: () => `Token de autenticação de Bot do Discord exposto em arquivo versionado.`,
  },
  // GitHub Personal Access Token & OAuth
  {
    name: 'GitHub Access Token',
    provider: 'GitHub',
    regex: /\b(?:ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82}|gho_[a-zA-Z0-9]{36})\b/g,
    ruleId: 'R03b',
    description: () => `Token de Acesso Pessoal do GitHub (ghp_/github_pat_) hardcoded.`,
  },
  // Chaves Privadas (RSA, EC, OpenSSH, PGP)
  {
    name: 'Chave Criptográfica Privada',
    provider: 'PKI / SSH',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g,
    ruleId: 'R03b',
    description: () => `Bloco de Chave Privada criptográfica (PEM/OpenSSH) inserido directamente no repositório.`,
  },
];

/**
 * Determina se o ficheiro pertence à categoria de "ficheiros não óbvios" (R03a)
 * onde secrets vazam frequentemente.
 */
export function isNonObviousSecretLocation(path: string): { isNonObvious: boolean; fileType: string } {
  const lower = path.toLowerCase().replace(/\\/g, '/');
  const filename = lower.split('/').pop() || '';

  // 1. Documentação / READMEs / Manuais de Troubleshooting
  if (
    filename.endsWith('.md') ||
    filename.endsWith('.markdown') ||
    filename.startsWith('readme') ||
    lower.includes('troubleshoot') ||
    lower.includes('guide') ||
    lower.includes('docs/')
  ) {
    return { isNonObvious: true, fileType: 'Documentação / README / Troubleshooting' };
  }

  // 2. Ficheiros .json de configuração (ex.: appsettings.json, config.json, settings.json, credentials.json)
  if (
    filename.endsWith('.json') &&
    (filename.includes('appsettings') ||
      filename.includes('config') ||
      filename.includes('setting') ||
      filename.includes('credential') ||
      filename.includes('secret') ||
      filename.includes('service-account') ||
      filename.includes('firebase'))
  ) {
    return { isNonObvious: true, fileType: 'Ficheiro JSON de Configuração' };
  }

  // 3. Ficheiros .txt "de teste" ou anotações
  if (
    filename.endsWith('.txt') ||
    lower.includes('/notes') ||
    lower.includes('/temp') ||
    lower.includes('/test-data')
  ) {
    return { isNonObvious: true, fileType: 'Ficheiro de Texto / Anotações / Teste' };
  }

  // 4. Scripts de Seed / Fixtures / Migrações com dados mockados
  if (
    lower.includes('seed') ||
    lower.includes('fixture') ||
    lower.includes('/mock') ||
    lower.includes('dummy') ||
    lower.includes('sample_data')
  ) {
    return { isNonObvious: true, fileType: 'Script de Seed / Fixtures de Banco de Dados' };
  }

  // 5. Histórico de Git / Commits antigos / Patches
  if (
    lower.includes('git log') ||
    lower.includes('.patch') ||
    lower.includes('.diff') ||
    lower.includes('commit-history')
  ) {
    return { isNonObvious: true, fileType: 'Histórico de Commits do Git (git log)' };
  }

  return { isNonObvious: false, fileType: 'Código Fonte' };
}

/**
 * Mascara strings sensíveis para exibição segura em relatórios de auditoria
 */
export function maskSecretValue(secret: string): string {
  if (!secret || secret.length < 8) return '********';
  const prefix = secret.slice(0, 6);
  const suffix = secret.slice(-4);
  return `${prefix}...${suffix}`;
}

/**
 * Executa uma varredura determinística de alta precisão sobre um arquivo
 * para detectar violações das regras R03a e R03b.
 */
export function scanFileForSecrets(path: string, content: string): ScoredFinding[] {
  const findings: ScoredFinding[] = [];
  if (!content || typeof content !== 'string') return findings;

  const lines = content.split('\n');
  const { isNonObvious, fileType } = isNonObviousSecretLocation(path);

  // 1. Verificação contra cada padrão de provedor
  for (const pattern of PROVIDER_PATTERNS) {
    // Reset regex state
    pattern.regex.lastIndex = 0;
    
    lines.forEach((line, lineIndex) => {
      // Pular linhas comentadas que são apenas referências de exemplo de doc vazia
      if (line.includes('your_api_key_here') || line.includes('sk_test_xxx') || line.includes('AKIAIOSFODNN7EXAMPLE')) {
        return;
      }

      const matches = Array.from(line.matchAll(pattern.regex));
      for (const m of matches) {
        const rawSecret = m[0];
        if (!rawSecret) continue;

        // Se estiver em ficheiro não óbvio (README, .json config, .txt, seed script, git log),
        // atribuímos com prioridade à regra R03a (CRÍTICO)
        const ruleId = isNonObvious ? 'R03a' : pattern.ruleId;
        const rule = getRuleById(ruleId);
        if (!rule) continue;

        const lineNumber = lineIndex + 1;
        const masked = maskSecretValue(rawSecret);
        const location = `${path}:${lineNumber}`;

        let description = '';
        if (isNonObvious) {
          description = `[${fileType}] Secret detectado em local não óbvio (${pattern.provider}: ${masked}). Ficheiros de documentação, configuração e seeds não devem armazenar credenciais vivas. Acção mandatória (R03c): Revogar/rotacionar a chave imediatamente no painel do provedor antes de limpar o histórico.`;
        } else {
          description = `${pattern.description(rawSecret, pattern.provider)} Acção mandatória (R03c): Revogar e rotacionar a credencial no painel do provedor.`;
        }

        // Trecho de evidência (máx 3 linhas ao redor)
        const start = Math.max(0, lineIndex - 1);
        const end = Math.min(lines.length, lineIndex + 2);
        const evidenceSnippet = lines
          .slice(start, end)
          .map((l, i) => `${start + i + 1}: ${l.replace(rawSecret, masked)}`)
          .join('\n');

        findings.push({
          rule: rule.id,
          severity: rule.severity,
          location,
          description,
          evidence: evidenceSnippet,
        });
      }
    });
  }

  // 2. Verificação adicional genérica em ficheiros não óbvios (R03a) para palavras-chave de senhas e tokens
  if (isNonObvious) {
    const genericSecretRegex = /\b(?:password|passwd|api_key|apikey|secret_key|auth_token|bearer_token|private_key)\s*[:=]\s*["']([^"'\s]{8,})["']/gi;
    
    lines.forEach((line, lineIndex) => {
      const matches = Array.from(line.matchAll(genericSecretRegex));
      for (const m of matches) {
        const secretVal = m[1];
        if (!secretVal || secretVal.includes('${') || secretVal.includes('process.env') || secretVal.includes('YOUR_') || secretVal.includes('EXAMPLE')) {
          continue;
        }

        const rule = getRuleById('R03a');
        if (!rule) continue;

        const lineNumber = lineIndex + 1;
        const masked = maskSecretValue(secretVal);
        const location = `${path}:${lineNumber}`;

        // Evitar duplicar finding se já capturado por padrão de provedor na mesma linha
        const alreadyExists = findings.some(f => f.location === location);
        if (alreadyExists) continue;

        const evidenceSnippet = `${lineNumber}: ${line.replace(secretVal, masked)}`;

        findings.push({
          rule: 'R03a',
          severity: 'CRITICO',
          location,
          description: `[${fileType}] Credencial/Secret hardcoded encontrado em ficheiro não óbvio (\`${masked}\`). Secrets fora do .env vazam facilmente em documentação e configurações.`,
          evidence: evidenceSnippet,
        });
      }
    });
  }

  return findings;
}

/**
 * Executa a varredura completa de secrets em uma lista de arquivos
 */
export function scanFilesForSecrets(files: { path: string; content: string }[]): ScoredFinding[] {
  const allFindings: ScoredFinding[] = [];
  const seenLocations = new Set<string>();

  for (const file of files) {
    const fileFindings = scanFileForSecrets(file.path, file.content);
    for (const f of fileFindings) {
      const key = `${f.rule}:${f.location}`;
      if (!seenLocations.has(key)) {
        seenLocations.add(key);
        allFindings.push(f);
      }
    }
  }

  return allFindings;
}
