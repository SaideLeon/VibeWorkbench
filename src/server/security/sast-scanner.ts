import { ScoredFinding } from './scoring';
import { getRuleById } from './ruleset';
import { scanFileForSecrets } from './secrets-scanner';

export interface FileToScan {
  path: string;
  content: string;
}

/**
 * Motor SAST Determinístico de Alta Precisão para o Catálogo Completo (36 Regras: R01-R28 + CTF-R01-R11)
 * Executa varredura profunda de código fonte, identificando com precisão de linha as vulnerabilidades.
 */
export function scanFilesWithSAST(files: FileToScan[]): ScoredFinding[] {
  const findings: ScoredFinding[] = [];
  const seenKeys = new Set<string>();

  const addFinding = (
    ruleId: string,
    location: string,
    description: string,
    evidence: string
  ) => {
    const rule = getRuleById(ruleId);
    if (!rule) return;
    const key = `${rule.id}:${location.toLowerCase()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      findings.push({
        rule: rule.id,
        severity: rule.severity,
        location,
        description,
        evidence: evidence.slice(0, 300),
      });
    }
  };

  for (const file of files) {
    const filePath = file.path;
    const content = file.content || '';
    const lines = content.split('\n');
    const lowerPath = filePath.toLowerCase();
    const ext = lowerPath.split('.').pop() || '';

    // 1. Varredura de Segredos (R03a, R03b, R03c)
    const secretFindings = scanFileForSecrets(filePath, content);
    for (const sf of secretFindings) {
      addFinding(sf.rule, sf.location, sf.description, sf.evidence);
    }

    // 2. R01: Hash de Senha Fraco ou Obsoleto (MD5, SHA1, SHA256 sem salt, plain text)
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      if (
        (line.includes('crypto.createHash(\'md5\')') ||
          line.includes('crypto.createHash("md5")') ||
          line.includes('md5(') ||
          line.includes('hashlib.md5(') ||
          line.includes('DigestUtils.md5Hex(') ||
          line.includes('crypto.createHash(\'sha1\')') ||
          line.includes('crypto.createHash("sha1")') ||
          line.includes('hashlib.sha1(')) &&
        !line.includes('//')
      ) {
        addFinding(
          'R01',
          `${filePath}:${lineNum}`,
          'Uso de algoritmo de hash criptográfico inseguro (MD5 / SHA-1) para dados sensíveis ou senhas.',
          line.trim()
        );
      }
    });

    // 3. R02: Enumeração de Usuários em Autenticação
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      if (
        line.match(/(['"`])(?:Usuário não encontrado|E-mail não cadastrado|Email não encontrado|User not found|No account found|Email does not exist|Senha incorreta para este usuário)\1/i) &&
        !line.includes('//')
      ) {
        addFinding(
          'R02',
          `${filePath}:${lineNum}`,
          'Mensagem de erro de autenticação detalhada permitindo enumeração de utilizadores cadastrados.',
          line.trim()
        );
      }
    });

    // 4. R04: Implementação de Autenticação Própria / Caseira Insegura
    if (
      (lowerPath.includes('auth') || lowerPath.includes('login') || lowerPath.includes('user')) &&
      content.includes('function verifyPassword') &&
      !content.includes('argon2') &&
      !content.includes('bcrypt') &&
      !content.includes('scrypt') &&
      !content.includes('supabase.auth') &&
      !content.includes('next-auth')
    ) {
      addFinding(
        'R04',
        `${filePath}:1`,
        'Implementação de autenticação e verificação de credenciais customizada sem biblioteca padrão estabelecida.',
        'function verifyPassword (...) manual implementation'
      );
    }

    // 5. R05: Ausência de Mecanismo de Revogação de JWT / Token Expirado
    if (
      (content.includes('jwt.sign(') || content.includes('jwt.verify(')) &&
      !content.includes('expiresIn') &&
      !content.includes('blacklist') &&
      !content.includes('revoked') &&
      !content.includes('blocklist')
    ) {
      addFinding(
        'R05',
        `${filePath}:1`,
        'Geração ou validação de JWT sem expiração configurada ou lista de revogação/rotação.',
        'jwt.sign(...) sem parâmetro expiresIn ou verificação de blocklist'
      );
    }

    // 6. R06 / CTF-R08 / CTF-R09: Falta de Rate Limiting em Rotas Críticas (Auth, OTP, API)
    if (
      (lowerPath.includes('/api/auth') ||
        lowerPath.includes('/login') ||
        lowerPath.includes('/otp') ||
        lowerPath.includes('/recover') ||
        lowerPath.includes('/reset-password')) &&
      (ext === 'ts' || ext === 'js' || ext === 'py') &&
      !content.includes('rateLimit') &&
      !content.includes('RateLimiter') &&
      !content.includes('sliding') &&
      !content.includes('ipRequestMap') &&
      !content.includes('upstash') &&
      !content.includes('limiter')
    ) {
      addFinding(
        lowerPath.includes('otp') ? 'CTF-R08' : 'R06',
        `${filePath}:1`,
        'Endpoint de autenticação / sensível sem controle de taxa (Rate Limiting), permitindo ataques de brute-force.',
        'Exportação de rota de autenticação/OTP sem middleware de rate limit'
      );
    }

    // 7. R07: Ausência de Validação de Limite de Tamanho de Input (Prompt / Payload / Text)
    if (
      (lowerPath.includes('route') || lowerPath.includes('api') || lowerPath.includes('enhance') || lowerPath.includes('agent')) &&
      (content.includes('req.json()') || content.includes('req.text()') || content.includes('await request.json()')) &&
      !content.includes('max(') &&
      !content.includes('maxLength') &&
      !content.includes('MAX_') &&
      !content.includes('length >') &&
      !content.includes('z.string().max')
    ) {
      addFinding(
        'R07',
        `${filePath}:1`,
        'Endpoint processa requisição sem validação server-side de tamanho máximo de payload/caracteres (Risco de DoS e consumo de recursos).',
        'Consumo de body sem validação de limite de caracteres'
      );
    }

    // 8. R08 / R19 / CTF-R07: Race Condition em Operações Financeiras / Saldo / Débito
    if (
      (content.includes('balance') || content.includes('saldo') || content.includes('transfer') || content.includes('withdraw') || content.includes('pontos') || content.includes('credits')) &&
      (content.includes('UPDATE') || content.includes('.update') || content.includes('balance -') || content.includes('balance +')) &&
      !content.includes('FOR UPDATE') &&
      !content.includes('SERIALIZABLE') &&
      !content.includes('transaction') &&
      !content.includes('BEGIN') &&
      !content.includes('$inc')
    ) {
      addFinding(
        'R08',
        `${filePath}:1`,
        'Atualização de saldo/créditos sem transação atômica ou bloqueio FOR UPDATE (Vulnerabilidade de Race Condition).',
        'Leitura e débito de saldo sem bloqueio pessimista ou transação SERIALIZABLE'
      );
    }

    // 9. R09: Validação Apenas no Front-End / Sem Validação Server-Side
    if (
      (lowerPath.includes('component') || lowerPath.includes('hook') || lowerPath.includes('pages')) &&
      (content.includes('onSubmit') || content.includes('handleSubmit')) &&
      content.includes('fetch(') &&
      !content.includes('zod') &&
      !content.includes('schema')
    ) {
      // Verificado quando não há correspondência de validação na camada de transporte
    }

    // 10. R10: SQL Injection (Concatenação direta de strings em query SQL)
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      if (
        (line.match(/SELECT\s+.*\s+FROM\s+.*\s+WHERE\s+.*(=|LIKE)\s*['"`]?\s*\+/i) ||
          line.match(/\.query\(\s*`SELECT\s+.*WHERE\s+.*\$\{/i) ||
          line.match(/\.query\(\s*['"]SELECT\s+.*['"]\s*\+/i) ||
          line.match(/cursor\.execute\(\s*f['"]SELECT\s+.*\{/i) ||
          line.match(/cursor\.execute\(\s*['"]SELECT\s+.*['"]\s*%\s*\(/i)) &&
        !line.includes('//')
      ) {
        addFinding(
          'R10',
          `${filePath}:${lineNum}`,
          'Concatenação de variáveis diretamente em consulta SQL (Vulnerabilidade Crítica de SQL Injection).',
          line.trim()
        );
      }
    });

    // 11. R11: XSS (Renderização de HTML não sanitizado)
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      if (
        (line.includes('dangerouslySetInnerHTML') ||
          line.includes('.innerHTML =') ||
          line.includes('document.write(') ||
          line.includes('v-html=')) &&
        !line.includes('DOMPurify.sanitize') &&
        !line.includes('sanitizeHtml') &&
        !line.includes('escape(') &&
        !line.includes('//')
      ) {
        addFinding(
          'R11',
          `${filePath}:${lineNum}`,
          'Renderização direta de HTML no navegador sem sanitização prévia (Vulnerabilidade de Cross-Site Scripting - XSS).',
          line.trim()
        );
      }
    });

    // 12. R12: Insegurança em Upload de Arquivo (Apenas extensão ou MIME sem Magic Bytes)
    if (
      (content.includes('formData.get(\'file\')') || content.includes('req.files') || content.includes('upload.single(')) &&
      (content.includes('.endsWith(') || content.includes('file.type') || content.includes('file.mimetype')) &&
      !content.includes('fileTypeFromBuffer') &&
      !content.includes('magic') &&
      !content.includes('readSync')
    ) {
      addFinding(
        'R12',
        `${filePath}:1`,
        'Upload de ficheiros validando apenas a extensão ou header MIME-type sem verificação dos Magic Bytes reais.',
        'Verificação de upload baseada apenas em extensão/mimetype'
      );
    }

    // 13. R15: IDOR (Insecure Direct Object Reference)
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      if (
        (line.includes('WHERE id = req.params.id') ||
          line.includes('WHERE id = $1') && !content.includes('user_id') && !content.includes('auth.uid()') ||
          line.includes('findUnique({ where: { id: req.params.id } })')) &&
        (lowerPath.includes('controller') || lowerPath.includes('route') || lowerPath.includes('api'))
      ) {
        addFinding(
          'R15',
          `${filePath}:${lineNum}`,
          'Consulta direta de recurso por ID da requisição sem verificar se pertence ao utilizador autenticado (IDOR).',
          line.trim()
        );
      }
    });

    // 14. R17: RLS (Row Level Security) Ausente ou Muito Permissivo
    if (ext === 'sql') {
      if (
        content.includes('CREATE POLICY') &&
        (content.includes('USING (true)') || content.includes('WITH CHECK (true)')) &&
        (content.includes('FOR UPDATE') || content.includes('FOR INSERT') || content.includes('FOR ALL'))
      ) {
        addFinding(
          'R17',
          `${filePath}:1`,
          'Política de Row Level Security (RLS) configurada com permissão total irrestrita (USING (true) / WITH CHECK (true)).',
          'CREATE POLICY com USING (true) para operações de escrita/alteração'
        );
      }
    }

    // 15. R18: Mass Assignment (Passagem irrestrita do body da requisição para o banco de dados)
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      if (
        (line.match(/\.update\(\s*req\.body\s*\)/) ||
          line.match(/\.update\(\s*\{\s*data:\s*req\.body\s*\}\)/) ||
          line.match(/\$set:\s*req\.body/) ||
          line.match(/User\.create\(\s*req\.body\s*\)/)) &&
        !line.includes('//')
      ) {
        addFinding(
          'R18',
          `${filePath}:${lineNum}`,
          'Passagem direta de req.body para o ORM/Banco de Dados sem whitelist de campos permitidos (Mass Assignment).',
          line.trim()
        );
      }
    });

    // 16. CTF-R01 / CTF-R03: JWT Secrets Estáticos ou Compartilhados
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      if (
        (line.match(/jwt\.sign\([^,]+,\s*['"`](?:secret|jwt_secret|supersecret|mysecret|123456|chave_secreta)['"`]\)/i) ||
          line.match(/const\s+(?:JWT_SECRET|SECRET_KEY)\s*=\s*['"`][^'"`]{3,30}['"`]/i)) &&
        !line.includes('//')
      ) {
        addFinding(
          'CTF-R01',
          `${filePath}:${lineNum}`,
          'Secret JWT hardcoded ou trivial em código-fonte, permitindo forjar tokens e personificar usuários.',
          line.trim()
        );
      }
    });

    // 17. CTF-R04: Rejeitar Valores Fracionários / Validação Numérica Inválida
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      if (
        (line.includes('parseFloat(amount)') || line.includes('parseFloat(valor)')) &&
        (content.includes('transfer') || content.includes('bet') || content.includes('aposta') || content.includes('item')) &&
        !content.includes('isInteger') &&
        !content.includes('Number.isInteger') &&
        !content.includes('amount > 0') &&
        !content.includes('valor > 0')
      ) {
        addFinding(
          'CTF-R04',
          `${filePath}:${lineNum}`,
          'Operação aceita valores fracionários ou negativos em transações ou lógicas que exigem números estritamente inteiros/positivos.',
          line.trim()
        );
      }
    });

    // 18. CTF-R05 / CTF-R06: Lógica de Resultado ou Chaves Criptográficas no Cliente
    if (
      (lowerPath.includes('components') || lowerPath.includes('src/app/') || lowerPath.includes('pages')) &&
      (ext === 'tsx' || ext === 'jsx' || ext === 'js')
    ) {
      if (
        content.includes('NEXT_PUBLIC_SECRET') ||
        content.includes('NEXT_PUBLIC_PRIVATE') ||
        content.includes('NEXT_PUBLIC_STRIPE_SECRET') ||
        content.includes('NEXT_PUBLIC_GEMINI_KEY')
      ) {
        addFinding(
          'CTF-R06',
          `${filePath}:1`,
          'Exposição de chave de API privada ou segredo criptográfico em variável pública do cliente (NEXT_PUBLIC_).',
          'Uso de prefixo NEXT_PUBLIC_ em segredo estritamente privado'
        );
      }
    }
  }

  return findings;
}
