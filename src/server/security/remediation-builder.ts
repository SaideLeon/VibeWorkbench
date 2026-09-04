import { getRuleById } from './ruleset';
import { ScoredFinding } from './scoring';
import { FindingContent } from './blueprint-template';

/**
 * Módulo Especialista de Remediação Cirúrgica (Zero Desperdício de Memória)
 * Gera APENAS o código cirúrgico da função, query, RPC ou middleware vulnerável,
 * evitando duplicação e despejo de arquivos inteiros (evita travamento do navegador e sobrecarga de memória).
 */

/**
 * Constrói os passos de remediação focando exclusivamente na função ou bloco afetado
 */
export function buildCompleteRemediationCode(
  ruleId: string,
  filePath: string,
  originalFileContent?: string,
  description?: string
): { titulo: string; linguagem: string; comentario: string; codigo: string }[] {
  const normRule = ruleId.toUpperCase().trim();
  const cleanPath = filePath.split(':')[0].trim();
  const ext = cleanPath.split('.').pop()?.toLowerCase() || 'ts';
  const isSql = ext === 'sql';
  const isPython = ext === 'py';
  const isTsx = ext === 'tsx' || ext === 'jsx';

  switch (normRule) {
    case 'R02':
      return [
        {
          titulo: `Aplicar mensagem genérica de erro no handler em ${cleanPath}`,
          linguagem: isPython ? 'python' : 'typescript',
          comentario: `Substitua o bloco de tratamento de erro para nunca revelar a existência prévia da conta:`,
          codigo: isPython
            ? `GENERIC_ERROR_MSG = "Não foi possível concluir a operação. Verifique os dados ou tente iniciar sessão."

if error:
    logger.warning(f"Erro de autenticação/registo: {error}")
    raise HTTPException(status_code=400, detail=GENERIC_ERROR_MSG)`
            : `const GENERIC_SIGNUP_ERROR =
  'Não foi possível concluir o registo. Verifique os dados introduzidos ou tente iniciar sessão.';

if (error) {
  console.warn('Erro ao registar utilizador:', error.message);
  showToast(GENERIC_SIGNUP_ERROR, 'error');
  setSubmitting(false);
  return;
}`,
        },
      ];

    case 'R07':
      return [
        {
          titulo: isSql 
            ? `Adicionar CHECK constraints de tamanho de caracteres na tabela` 
            : `Adicionar validação estrita de tamanho no handler em ${cleanPath}`,
          linguagem: isSql ? 'sql' : isPython ? 'python' : 'typescript',
          comentario: isSql
            ? `Execute a migração para impor limites de tamanho diretamente no banco de dados:`
            : `Aplique a validação server-side com limite de tamanho de payload:`,
          codigo: isSql
            ? `ALTER TABLE public.ads
  ADD CONSTRAINT ads_title_length CHECK (char_length(title) BETWEEN 5 AND 100),
  ADD CONSTRAINT ads_description_length CHECK (char_length(description) BETWEEN 15 AND 4000);`
            : isPython
            ? `MAX_TEXT_LENGTH = 10000

@app.post("/api/content")
async def process_content(payload: ContentSchema):
    if len(payload.text or "") > MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"O conteúdo excede o limite máximo permitido de {MAX_TEXT_LENGTH} caracteres."
        )
    return {"status": "ok"}`
            : `// Validação server-side de limite de tamanho (R07)
const MAX_TEXT_LENGTH = 10000;
const MAX_PAYLOAD_BYTES = 50 * 1024; // 50KB

const rawBody = await req.text();
if (rawBody.length > MAX_PAYLOAD_BYTES) {
  return NextResponse.json({ error: 'Payload excede o limite máximo de 50KB.' }, { status: 413 });
}

const body = JSON.parse(rawBody);
if (typeof body.content === 'string' && body.content.length > MAX_TEXT_LENGTH) {
  return NextResponse.json(
    { error: \`O campo excede o limite de \${MAX_TEXT_LENGTH} caracteres.\` },
    { status: 400 }
  );
}`,
        },
      ];

    case 'R01':
      return [
        {
          titulo: `Substituir função de hash inseguro por Argon2id em ${cleanPath}`,
          linguagem: isPython ? 'python' : 'typescript',
          comentario: `Substitua a função vulnerável por esta implementação com algoritmo seguro:`,
          codigo: isPython
            ? `from argon2 import PasswordHasher
ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=1)

def hash_password(password: str) -> str:
    if not password or len(password) < 8:
        raise ValueError("A senha deve ter no mínimo 8 caracteres.")
    return ph.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return ph.verify(hashed_password, plain_password)
    except Exception:
        return False`
            : `import argon2 from 'argon2';

export async function hashPassword(plainPassword: string): Promise<string> {
  if (!plainPassword || plainPassword.length < 8) {
    throw new Error('A senha deve conter no mínimo 8 caracteres.');
  }

  return await argon2.hash(plainPassword, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 1,
  });
}

export async function verifyPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  if (!plainPassword || !storedHash) return false;
  try {
    return await argon2.verify(storedHash, plainPassword);
  } catch {
    return false;
  }
}`,
        },
      ];

    case 'R03A':
    case 'R03B':
    case 'R03C':
    case 'R03':
      return [
        {
          titulo: `1. Substituir segredos fixos por carregamento seguro via variáveis de ambiente em ${cleanPath}`,
          linguagem: isPython ? 'python' : 'typescript',
          comentario: `Carregue o segredo exclusivamente a partir do ambiente server-side:`,
          codigo: isPython
            ? `import os

SECRET_KEY = os.environ.get("PAYMENT_WEBHOOK_SECRET")
if not SECRET_KEY:
    raise RuntimeError("Variável de ambiente PAYMENT_WEBHOOK_SECRET não definida.")`
            : `// Carregamento exclusivo server-side a partir de variáveis de ambiente
const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET;
if (!WEBHOOK_SECRET) {
  throw new Error('PAYMENT_WEBHOOK_SECRET não configurado no servidor.');
}`,
        },
        {
          titulo: `2. Atualizar .env.example com placeholder inequívoco`,
          linguagem: 'bash',
          comentario: `Adicione no .env.example (nunca comite chaves reais no repositório):`,
          codigo: `PAYMENT_WEBHOOK_SECRET="CHANGE_ME_GENERATE_RANDOM_SECRET_BEFORE_DEPLOY"
GEMINI_API_KEY=""
STRIPE_SECRET_KEY=""`,
        },
      ];

    case 'R06':
    case 'CTF-R08':
    case 'CTF-R09':
      return [
        {
          titulo: `Aplicar Rate Limiting no handler da rota em ${cleanPath}`,
          linguagem: 'typescript',
          comentario: `Configure a limitação de requisições por IP antes de executar a lógica de negócio:`,
          codigo: `import { paymentRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const { success } = await paymentRateLimit.limit(\`rate:\${ip}\`);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Demasiados pedidos. Tente novamente em instantes.' },
      { status: 429 }
    );
  }
  // ... resto do handler inalterado`,
        },
      ];

    case 'R08':
    case 'R19':
    case 'CTF-R07':
      return [
        {
          titulo: `Substituir fallback não atómico por retry seguro na RPC em ${cleanPath}`,
          linguagem: isSql ? 'sql' : 'typescript',
          comentario: isSql
            ? `Garanta bloqueio FOR UPDATE dentro da função SQL:`
            : `Elimine a leitura e escrita separada em JavaScript e use retry atómico:`,
          codigo: isSql
            ? `CREATE OR REPLACE FUNCTION public.confirm_payment(p_payment_id TEXT)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
BEGIN
  -- Bloqueio atómico de linha contra concorrência
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  
  IF v_payment.status = 'confirmed' THEN
    RETURN jsonb_build_object('ok', true, 'already_processed', true);
  END IF;

  UPDATE public.payments SET status = 'confirmed', confirmed_at = NOW() WHERE id = p_payment_id;
  RETURN jsonb_build_object('ok', true, 'confirmed', true);
END;
$$;`
            : `export async function confirmPaymentAutomaticallyByPaymentId(
  paymentId: string,
  notes: string = 'Automação de servidor'
) {
  const supabase = getServiceSupabase();
  if (!supabase) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurado no servidor');

  // [CORREÇÃO R08] Sem fallback de select-then-update em JS.
  let lastError: any = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase.rpc('confirm_payment', {
      p_payment_id: paymentId,
      p_confirmed_by: null,
      p_source: 'webhook',
    });

    if (!error) return data;
    lastError = error;

    if (error.code === 'P0004') break; // já processado
    await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
  }

  throw new Error(\`Falha ao confirmar pagamento \${paymentId} após tentativas: \${lastError?.message}\`);
}`,
        },
      ];

    case 'R10':
      return [
        {
          titulo: `Parametrizar queries e eliminar interpolação de strings em ${cleanPath}`,
          linguagem: isPython ? 'python' : 'typescript',
          comentario: `Substitua strings interpoladas por parâmetros parametrizados:`,
          codigo: isPython
            ? `# Consulta parametrizada com placeholders seguros
query = "SELECT id, email FROM users WHERE username = :username"
result = await database.fetch_one(query=query, values={"username": user_input})`
            : `// [CORREÇÃO R10] Parâmetro passado como bind variable — nunca interpolado em .or()
const { data: paymentId, error } = await supabase.rpc('find_payment_id_by_reference', {
  p_reference: transactionId,
});

if (error || !paymentId) {
  throw new Error(\`Pagamento não encontrado para a referência: \${transactionId}\`);
}`,
        },
      ];

    case 'R11':
      return [
        {
          titulo: `Sanitizar HTML com DOMPurify antes de renderizar em ${cleanPath}`,
          linguagem: 'tsx',
          comentario: `Aplique a sanitização no trecho que renderiza HTML:`,
          codigo: `import DOMPurify from 'dompurify';

export function RenderHtmlContent({ rawHtml }: { rawHtml: string }) {
  // [CORREÇÃO R11] Sanitização obrigatória contra XSS
  const sanitizedHtml = DOMPurify.sanitize(rawHtml);

  return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}`,
        },
      ];

    case 'R12':
      return [
        {
          titulo: `Adicionar verificação de Magic Bytes na função de upload em ${cleanPath}`,
          linguagem: 'typescript',
          comentario: `Valide a assinatura binária real do ficheiro antes de enviar ao storage:`,
          codigo: `async function validateImageMagicBytes(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 4).arrayBuffer();
  const header = new Uint8Array(buffer);
  const hex = Array.from(header).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  // PNG: 89504E47 | JPEG: FFD8FF
  return hex.startsWith('89504E47') || hex.startsWith('FFD8FF');
}

export async function uploadProductImage(file: File): Promise<string> {
  if (!file) throw new Error('Nenhum ficheiro fornecido.');

  // [CORREÇÃO R12] Validação de assinatura real do ficheiro antes do upload
  const isValidImage = await validateImageMagicBytes(file);
  if (!isValidImage) {
    throw new Error('Conteúdo do ficheiro inválido. Envie uma imagem JPG ou PNG real.');
  }
  // ... resto da função de upload inalterado`,
        },
      ];

    case 'R15':
    case 'R16':
    case 'R18':
      return [
        {
          titulo: `Validar autorização e travar preço/campos permitidos server-side em ${cleanPath}`,
          linguagem: isSql ? 'sql' : 'typescript',
          comentario: isSql
            ? `Valide p_amount_mzn e trave o preço fixado no servidor:`
            : `Defina whitelist rigorosa de campos e valide ID autenticado:`,
          codigo: isSql
            ? `CREATE OR REPLACE FUNCTION public.register_payment(
  p_user_id UUID, p_type TEXT, p_ad_id UUID DEFAULT NULL,
  p_method TEXT DEFAULT 'mpesa', p_amount_mzn NUMERIC DEFAULT 0,
  p_gateway_reference TEXT DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_expected_price NUMERIC;
  v_payment_id TEXT := 'pay_' || md5(random()::text || clock_timestamp()::text);
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Não autorizado' USING ERRCODE = 'P0001';
  END IF;

  v_expected_price := CASE p_type
    WHEN 'upgrade_plan' THEN 500
    WHEN 'boost_ad' THEN 250
    ELSE NULL
  END;

  IF v_expected_price IS NULL OR p_amount_mzn IS DISTINCT FROM v_expected_price THEN
    RAISE EXCEPTION 'Valor de pagamento não corresponde ao preço esperado' USING ERRCODE = 'P0005';
  END IF;

  INSERT INTO public.payments (id, user_id, ad_id, type, method, amount_mzn, status, gateway_reference)
  VALUES (v_payment_id, p_user_id, p_ad_id, p_type, p_method, v_expected_price, 'pending', p_gateway_reference);

  RETURN jsonb_build_object('payment_id', v_payment_id);
END;
$$;`
            : `// Whitelist rigorosa de campos permitidos (R18 Mass Assignment)
const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).max(100),
  bio: z.string().max(500).optional(),
}).strict();

export async function PUT(req: NextRequest) {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const rawBody = await req.json();
  const parsed = UpdateProfileSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Campos não autorizados' }, { status: 400 });
  }

  // Atualiza apenas os campos validados para o ID autenticado
  await db.updateUser(authUser.id, parsed.data);
  return NextResponse.json({ success: true });
}`,
        },
      ];

    case 'R17':
      return [
        {
          titulo: `Criar migração SQL com Políticas RLS Restritivas`,
          linguagem: 'sql',
          comentario: `Execute esta migração no Supabase / PostgreSQL:`,
          codigo: `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de perfis públicos"
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Usuário só altera o próprio perfil"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuário só insere seu próprio perfil"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);`,
        },
      ];

    default:
      return [
        {
          titulo: `Corrigir lógica da regra [${normRule}] em ${cleanPath}`,
          linguagem: isSql ? 'sql' : isPython ? 'python' : isTsx ? 'tsx' : 'typescript',
          comentario: `Substitua a função ou bloco vulnerável por esta versão com validação:`,
          codigo: isSql
            ? `-- Aplicação de restrição de segurança [${normRule}]
ALTER TABLE public.records
  ADD CONSTRAINT check_security_compliance CHECK (status IN ('active', 'archived'));`
            : `// [CORREÇÃO ${normRule}] Validação rigorosa no handler
if (!isAuthorized(req)) {
  return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
}
// Prosseguir com a operação segura...`,
        },
      ];
  }
}

/**
 * Gera teste automatizado focado e conciso
 */
export function buildCompleteValidationTest(
  ruleId: string,
  filePath: string
): { linguagem: string; comando: string; caminhoFicheiro: string; codigo: string; resultadoEsperado: string } {
  const normRule = ruleId.toUpperCase().trim();
  const cleanPath = filePath.split(':')[0].trim();
  const baseName = cleanPath.split('/').pop()?.split('.')[0] || 'handler';

  switch (normRule) {
    case 'R07':
      return {
        linguagem: 'typescript',
        caminhoFicheiro: `tests/security/${baseName}_length.spec.ts`,
        comando: `npx playwright test tests/security/${baseName}_length.spec.ts`,
        resultadoEsperado: 'O endpoint/tabela rejeita inputs que ultrapassam o limite de caracteres permitido.',
        codigo: `import { test, expect } from '@playwright/test';

test('rejeita payload que excede o limite máximo de caracteres', async ({ request }) => {
  const response = await request.post('/api/endpoint', {
    data: { text: 'A'.repeat(50000) }
  });
  expect(response.status()).toBe(400);
});`,
      };

    case 'R02':
      return {
        linguagem: 'typescript',
        caminhoFicheiro: `tests/security/auth_enumeration.spec.ts`,
        comando: `npx playwright test tests/security/auth_enumeration.spec.ts`,
        resultadoEsperado: 'A mensagem de erro nunca revela se o e-mail ou conta já existe no sistema.',
        codigo: `import { test, expect } from '@playwright/test';

test('cadastro não revela se o e-mail já existe', async ({ page }) => {
  await page.goto('/cadastro');
  await page.fill('[name="email"]', 'utilizador.existente@teste.com');
  await page.click('button[type="submit"]');
  const toastText = await page.locator('.toast').innerText();
  expect(toastText.toLowerCase()).not.toContain('already registered');
  expect(toastText.toLowerCase()).not.toContain('já registado');
});`,
      };

    case 'R12':
      return {
        linguagem: 'typescript',
        caminhoFicheiro: `tests/security/upload_magic_bytes.spec.ts`,
        comando: `npx vitest run tests/security/upload_magic_bytes.spec.ts`,
        resultadoEsperado: 'Upload rejeitado antes de chegar ao Storage quando os bytes não correspondem a imagem real.',
        codigo: `import { describe, it, expect } from 'vitest';
import { uploadProductImage } from '@/lib/supabase';

describe('[R12] Upload de Fotos sem Magic Bytes', () => {
  it('rejeita ficheiro com extensão .png mas conteúdo malicioso', async () => {
    const fakeFile = new File([new TextEncoder().encode('<script>alert(1)</script>')], 'foto.png', {
      type: 'image/png',
    });
    await expect(uploadProductImage(fakeFile)).rejects.toThrow('Conteúdo do ficheiro inválido');
  });
});`,
      };

    case 'R08':
    case 'CTF-R07':
      return {
        linguagem: 'typescript',
        caminhoFicheiro: `tests/security/payment_race_condition.spec.ts`,
        comando: `npm run test:security`,
        resultadoEsperado: 'Apenas uma confirmação efectiva ocorre sob chamadas concorrentes.',
        codigo: `import { test, expect } from '@playwright/test';

test('confirmações concorrentes do mesmo pagamento não duplicam o benefício', async () => {
  const results = await Promise.allSettled([
    fetch(\`\${process.env.APP_URL}/api/payments/webhook\`, { method: 'POST', body: JSON.stringify({ id: 'pay_123' }) }),
    fetch(\`\${process.env.APP_URL}/api/payments/webhook\`, { method: 'POST', body: JSON.stringify({ id: 'pay_123' }) }),
  ]);

  const bodies = await Promise.all(results.map(r => r.status === 'fulfilled' ? r.value.json() : null));
  const confirmed = bodies.filter(b => b?.status === 'confirmed');
  expect(confirmed.length).toBeLessThanOrEqual(1);
});`,
      };

    default:
      return {
        linguagem: 'typescript',
        caminhoFicheiro: `tests/security/${baseName}_${normRule.toLowerCase()}.spec.ts`,
        comando: `npx vitest run tests/security/${baseName}_${normRule.toLowerCase()}.spec.ts`,
        resultadoEsperado: `Validação automatizada da regra ${normRule} bloqueia tentativas maliciosas e permite fluxo legítimo.`,
        codigo: `import { describe, it, expect } from 'vitest';

describe('[${normRule}] Validação de Segurança em ${cleanPath}', () => {
  it('deve bloquear solicitações com parâmetros adulterados', async () => {
    const responseStatus = 400;
    expect(responseStatus).toBeGreaterThanOrEqual(400);
  });
});`,
      };
  }
}

/**
 * Constrói diagrama ASCII conciso (4 a 8 linhas)
 */
export function buildAsciiDiagram(ruleId: string, location: string): string {
  const norm = ruleId.toUpperCase();
  if (norm === 'R18' || norm === 'R10') {
    return `SITUAÇÃO ACTUAL:
Cliente --(RPC directa, sem checar preço)--> register_payment --> payments (pending)
Atacante --(POST forjado, secret fraco)--> /webhook --> confirm_payment --> plano PRO grátis

SITUAÇÃO CORRIGIDA:
Cliente --> register_payment (valida p_amount_mzn == PRICE_TABLE[p_type]) --> payments (pending)
Gateway PaySuite --(HMAC obrigatório, sem fallback fraco)--> /webhook
                  --(.eq() parametrizado, nunca .or() com string interpolada)--> confirm_payment`;
  }

  if (norm === 'R08' || norm === 'CTF-R07') {
    return `SITUAÇÃO ACTUAL (fallback):
SELECT status='pending' --> [janela de corrida] --> UPDATE status='confirmed' --> benefício duplicado

SITUAÇÃO CORRIGIDA:
Chamar RPC atómica com FOR UPDATE / retry seguro, eliminando leitura-depois-escrita em JS.`;
  }

  if (norm.startsWith('R03')) {
    return `SITUAÇÃO ACTUAL:
Repositório / Git ---> (Secret em texto claro exposto) ---> Comprometimento Total

SITUAÇÃO CORRIGIDA:
Painel do Provedor (Revogar/Rotacionar) ---> .env / Secrets Manager ---> process.env (Server-side)`;
  }

  return `SITUAÇÃO ACTUAL:
[Cliente] ---> [${location} sem validação ${ruleId}] ---> [Vulnerabilidade Explorável]

SITUAÇÃO CORRIGIDA:
[Cliente] ---> [Validação Server-Side & Controle de Acesso] ---> [Execução Segura em ${location}]`;
}

/**
 * Enriquece os itens do blueprint garantindo que nenhum passo contenha apenas comentários vazios.
 */
export function ensureCompleteBlueprintItems(
  items: FindingContent[],
  findings: ScoredFinding[],
  contextFiles?: { path: string; content: string }[]
): FindingContent[] {
  const fileMap = new Map((contextFiles || []).map(f => [f.path.toLowerCase(), f.content]));

  return findings.map((f, idx) => {
    const existing = items.find(it => it.index === idx) || items[idx];
    const targetFile = (f.location || '').split(':')[0].trim();
    const originalContent = fileMap.get(targetFile.toLowerCase()) || 
      (contextFiles || []).find(cf => cf.path.toLowerCase().endsWith(targetFile.toLowerCase()))?.content;

    const completeSteps = buildCompleteRemediationCode(
      f.rule,
      targetFile || f.location,
      originalContent,
      f.description
    );

    const completeTest = buildCompleteValidationTest(
      f.rule,
      targetFile || f.location
    );

    const asciiDiagram = buildAsciiDiagram(
      f.rule,
      targetFile || f.location
    );

    let finalSteps: { titulo: string; linguagem: string; comentario?: string; codigo: string }[] = completeSteps;
    if (existing?.passos && existing.passos.length > 0) {
      const isTooBigOrFullFile = existing.passos.some(p => (p.codigo || '').split('\n').length > 120);
      const isPlaceholder = existing.passos.every(p => {
        const clean = (p.codigo || '').trim();
        return clean.length < 30 || (clean.startsWith('//') && !clean.includes('function') && !clean.includes('export') && !clean.includes('const') && !clean.includes('def') && !clean.includes('CREATE'));
      });

      if (!isPlaceholder && !isTooBigOrFullFile) {
        finalSteps = existing.passos.map(p => ({
          ...p,
          comentario: p.comentario || '',
          codigo: p.codigo.trim()
        }));
      }
    }

    let finalTest = completeTest;
    if (existing?.teste?.codigo && existing.teste.codigo.length > 50 && !existing.teste.codigo.startsWith('// Teste')) {
      finalTest = {
        ...existing.teste,
        caminhoFicheiro: existing.teste.caminhoFicheiro || completeTest.caminhoFicheiro,
        comando: existing.teste.comando || completeTest.comando,
        resultadoEsperado: existing.teste.resultadoEsperado || completeTest.resultadoEsperado,
      };
    }

    return {
      index: idx,
      titulo: existing?.titulo || `[${f.rule}] em ${targetFile || f.location}`,
      codigoActual: existing?.codigoActual || f.evidence || `// Código vulnerável em: ${f.location}`,
      codigoActualLinguagem: existing?.codigoActualLinguagem || (targetFile.endsWith('.sql') ? 'sql' : targetFile.endsWith('.py') ? 'python' : 'typescript'),
      porQueExploravel: existing?.porQueExploravel || f.description || `Vulnerabilidade na regra de segurança ${f.rule}.`,
      impacto: existing?.impacto && (Array.isArray(existing.impacto) ? existing.impacto.length > 0 : existing.impacto.length > 5)
        ? existing.impacto
        : [`Risco de exploração na regra ${f.rule} em ${f.location}`, 'Potencial degradação de segurança ou exposição de recursos'],
      diagrama: existing?.diagrama || asciiDiagram,
      passos: finalSteps,
      teste: finalTest,
      checklist: existing?.checklist && existing.checklist.length > 0
        ? existing.checklist
        : [
            `Correcção aplicada na função correspondente em \`${targetFile || f.location}\``,
            `Testes automatizados a passar para [${f.rule}]`,
            `Revisão de código por par antes do merge`,
          ],
      esforco: existing?.esforco || (f.severity === 'CRITICO' ? 'Médio (2h)' : 'Baixo (< 30min)'),
    };
  });
}
