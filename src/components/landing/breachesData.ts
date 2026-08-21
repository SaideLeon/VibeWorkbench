import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldAlert, 
  Terminal, 
  Key, 
  Lock, 
  Database, 
  Cpu, 
  Layers, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  ExternalLink,
  Code2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreachLayer {
  id: number;
  layerNumber: string;
  title: string;
  shortSummary: string;
  category: string;
  icon: typeof ShieldAlert;
  incidentTitle: string;
  incidentDate: string;
  incidentImpact: string;
  incidentDetails: string;
  vulnerabilityExplanation: string;
  analogy: string;
  vulnerableCodeSnippet: {
    language: string;
    filename: string;
    code: string;
  };
  secureCodeSnippet: {
    language: string;
    filename: string;
    code: string;
  };
  howWeProtect: string;
  ruleIds: string[];
}

export const BREACH_LAYERS: BreachLayer[] = [
  {
    id: 1,
    layerNumber: 'Camada 1',
    title: 'Autorização no Lado do Cliente (Client-Side)',
    shortSummary: 'Decisões de permissão e planos VIP/Premium validadas no navegador do usuário via LocalStorage ou DOM.',
    category: 'Controle de Acesso & Paywall',
    icon: Lock,
    incidentTitle: 'Bypass de Paywall e Planos em Plataformas SaaS',
    incidentDate: 'Demonstrado em SaaS de Impressão 3D e Plataformas VibeCode',
    incidentImpact: 'Qualquer visitante com 2 cliques no F12 desbloqueia recursos pagos e conteúdo restrito sem pagar um centavo.',
    incidentDetails: 'Ao abrir o DevTools (F12) na aba Application ou no DOM Inspector, valores de variáveis como "subscription: false", "plan: free" ou "hasAccess: false" são facilmente alterados para "true" ou "premium" pelo usuário, pois a IA gerou a validação inteiramente no front-end em vez de consultar o servidor a cada requisição.',
    vulnerabilityExplanation: 'Parte do código de qualquer site é baixada e executada diretamente no computador do visitante. Se a inteligência artificial não criou uma checagem rigorosa no backend/servidor, o navegador do cliente toma decisões que podem ser forjadas em segundos por qualquer pessoa curiosa.',
    analogy: 'É como desenhar uma fechadura na porta com caneta esferográfica e achar que o quarto está trancado.',
    vulnerableCodeSnippet: {
      language: 'typescript',
      filename: 'components/FeatureGate.tsx (Vulnerável)',
      code: `// ❌ ERRO TÍPICO DE VIBECODING: Validação 100% no cliente
export function PremiumFeature() {
  // O usuário pode abrir o Console e rodar:
  // localStorage.setItem("plan", "premium");
  const userPlan = localStorage.getItem("plan");

  if (userPlan !== "premium") {
    return <PaywallModal />;
  }

  return <SecretStrategyDashboard />;
}`
    },
    secureCodeSnippet: {
      language: 'typescript',
      filename: 'server/auth.ts (Mitigar IA Blindado)',
      code: `// ✅ CORREÇÃO ROBUSTA: Autorização criptográfica no servidor
export async function getPremiumData(req: Request) {
  const session = await verifyServerSession(req);
  if (!session?.userId) throw new UnauthorizedError();

  // Consulta o banco de dados no servidor — impossível de forjar via F12
  const user = await db.users.findUnique({ where: { id: session.userId } });
  if (user.subscriptionStatus !== 'ACTIVE_PREMIUM') {
    throw new ForbiddenError('Assinatura premium requerida');
  }

  return fetchProtectedContent();
}`
    },
    howWeProtect: 'O Mitigar IA escaneia componentes e rotas da sua aplicação, identificando verificações de permissão baseadas em estado local (Regras R09, R15, R16) e gerando rotas protegidas no servidor.',
    ruleIds: ['R09', 'R15', 'R16', 'CTF-R05']
  },
  {
    id: 2,
    layerNumber: 'Camada 2',
    title: 'Gestão de Segredos & Chaves de API Expostas',
    shortSummary: 'Chaves mestras da OpenAI, Stripe e Supabase embutidas no pacote JavaScript público do front-end.',
    category: 'Segredos & Credenciais',
    icon: Key,
    incidentTitle: 'Vazamento de Chaves Privadas em Bundles de Produção',
    incidentDate: 'Comum em 35%+ dos apps gerados por IA sem backend intermediário',
    incidentImpact: 'Invasores roubam credenciais com privilégios de desenvolvedor, consomem saldos de cartões de crédito e alteram dados sensíveis.',
    incidentDetails: 'Quando o desenvolvedor cola chaves de API diretamente no chat da IA (OpenAI, Stripe Secret Key, Supabase Service Role), a IA frequentemente as coloca em variáveis estáticas no código do React/Vue/HTML. Ao abrir a aba "Sources" e buscar por "key", "secret" ou "sk-proj-", a chave inteira aparece exposta.',
    vulnerabilityExplanation: 'Uma chave de API privada não representa a identidade do usuário, e sim a identidade e os superpoderes do desenvolvedor. Quando exposta no navegador, qualquer visitante ganha privilégios irrestritos de administração.',
    analogy: 'É exatamente igual a pendurar a chave mestra de um prédio inteiro do lado de fora da maçaneta da entrada.',
    vulnerableCodeSnippet: {
      language: 'typescript',
      filename: 'src/services/ai.ts (Vulnerável)',
      code: `// ❌ ERRO CRÍTICO: Chave mestra exposta no código do cliente
import { OpenAI } from "openai";

// Esta chave é empacotada no bundle JavaScript público!
const openai = new OpenAI({
  apiKey: "sk-proj-98af38b9e8172c3d4a5b6c7d8e9f...",
  dangerouslyAllowBrowser: true // Alerta ignorado pela IA
});`
    },
    secureCodeSnippet: {
      language: 'typescript',
      filename: 'app/api/ai/route.ts (Mitigar IA Blindado)',
      code: `// ✅ SEGREDO PROTEGIDO NO SERVIDOR:
// A chave nunca sai da infraestrutura e não existe no navegador
import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

const serverAi = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  // Rate limiting + Validação de sessão do usuário
  const { prompt } = await req.json();
  const res = await serverAi.chat.completions.create({ ... });
  return NextResponse.json({ result: res.choices[0] });
}`
    },
    howWeProtect: 'O motor de análise do Mitigar IA executa busca estática e semântica por tokens, chaves de API e credenciais hardcoded (Regras R03, CTF-R06), gerando rotas de proxy de API seguras e declarando variáveis em .env.example.',
    ruleIds: ['R03', 'CTF-R06', 'R22']
  },
  {
    id: 3,
    layerNumber: 'Camada 3',
    title: 'Falhas Estruturais de Autenticação / Bypass de OTP',
    shortSummary: 'Identificadores públicos de aplicativos (app_id) utilizados como chave de porta para registrar contas e burlar login corporativo.',
    category: 'Autenticação & OTP',
    icon: ShieldAlert,
    incidentTitle: 'O Caso Base44 — Invasão em Massa de 20.000 Aplicativos',
    incidentDate: 'Identificado em 2025/2026 por pesquisadores de segurança',
    incidentImpact: 'Invasores conseguiam criar contas com privilégios administrativos em sistemas corporativos privados em menos de 10 segundos.',
    incidentDetails: 'Na plataforma Base44, bastava ao invasor copiar o "app_id=1234" exposto na barra de endereços do navegador e disparar uma requisição direta ao endpoint de registro e envio de OTP. O servidor criava a conta para o e-mail do invasor e enviava o código para sua caixa de entrada, ignorando completamente o login corporativo SSO (Single Sign-On).',
    vulnerabilityExplanation: 'O identificador público de um app é como a placa com o número da casa. O erro grave ocorre quando a infraestrutura trata essa placa como a própria chave da porta, aceitando requisições de criação de usuários e validação de tokens sem autenticação prévia de contexto.',
    analogy: 'Um hotel de luxo com portões de ferro e reconhecimento facial na entrada principal, mas com a porta dos fundos escancarada e sem recepcionista.',
    vulnerableCodeSnippet: {
      language: 'typescript',
      filename: 'api/register.ts (Vulnerável)',
      code: `// ❌ FALHA ESTRUTURAL: Aceita app_id público para criar conta em app privado
export async function handleRegister(req: Request) {
  const { appId, targetEmail } = await req.json();
  
  // Qualquer um que passe o appId cria usuário na organização privada
  const otpCode = generateOTP();
  await sendEmail(targetEmail, otpCode);
  return { status: "OTP_SENT_SUCCESSFULLY" };
}`
    },
    secureCodeSnippet: {
      language: 'typescript',
      filename: 'api/register.ts (Mitigar IA Blindado)',
      code: `// ✅ FLUXO SEGURO COM CONTEXTO E RATE LIMITING:
export async function handleRegister(req: Request) {
  await enforceRateLimit(req, { maxAttempts: 5, windowMinutes: 15 });
  const { orgDomainToken, email } = await validatePayload(req);
  
  // Verifica permissão explícita de convite da organização
  const invite = await db.invites.findValid(orgDomainToken, email);
  if (!invite) throw new UnauthorizedError('Domínio ou convite inválido');

  return sendSecureScopedOTP(email, invite.tenantId);
}`
    },
    howWeProtect: 'O Mitigar IA audita fluxos de autenticação, rate limiting em OTP e endpoints de registro (Regras R01, R02, R06, CTF-R08, CTF-R09) para eliminar brechas de criação de contas não autorizadas.',
    ruleIds: ['R01', 'R02', 'R06', 'CTF-R08', 'CTF-R09']
  },
  {
    id: 4,
    layerNumber: 'Camada 4',
    title: 'Controle de Acesso ao Banco de Dados / RLS Inexistente',
    shortSummary: 'Bancos de dados Supabase/PostgreSQL com anon_key pública operando sem políticas restritivas de Row Level Security.',
    category: 'Banco de Dados & RLS',
    icon: Database,
    incidentTitle: 'O Caso Lovable Linkable & Estudo de Matt Palmer',
    incidentDate: 'Março de 2025 — 170 de 1.645 apps vazando dados',
    incidentImpact: '10% de todos os apps da vitrine pública vazando nomes, e-mails, endereços residenciais, telefones e chaves de API. Um único app expôs 19.000 usuários.',
    incidentDetails: 'O pesquisador Matt Palmer removeu o cabeçalho de autenticação de uma requisição simples e o banco devolveu toda a tabela de usuários. Um segundo pesquisador, 1 ano depois, usou apenas 15 linhas de código em Python e, em 47 minutos, extraiu endereços residenciais de aplicativos recém-lançados porque o verificador superficial checava apenas se o RLS estava ligado, e não se a regra impedia acessos indevidos.',
    vulnerabilityExplanation: 'O Supabase expõe a anon_key pública de propósito no navegador. Ela só é segura se o Row Level Security (RLS) for ativado E contiver políticas explícitas dizendo que o usuário A só pode ler linhas onde "user_id = auth.uid()". Sem isso, a chave pública abre o banco inteiro.',
    analogy: 'Dar a chave da porta da rua para todos os vizinhos e esquecer de trancar os quartos individuais.',
    vulnerableCodeSnippet: {
      language: 'sql',
      filename: 'supabase/migrations/schema.sql (Vulnerável)',
      code: `-- ❌ RLS DESATIVADO OU COM POLÍTICA TOTALMENTE ABERTA
ALTER TABLE users_private_data ENABLE ROW LEVEL SECURITY;

-- Esta política deixa QUALQUER visitante da internet ler e baixar tudo!
CREATE POLICY "Public Read Access" 
ON users_private_data 
FOR SELECT 
USING (true);`
    },
    secureCodeSnippet: {
      language: 'sql',
      filename: 'supabase/migrations/schema.sql (Mitigar IA Blindado)',
      code: `-- ✅ POLÍTICA RLS RESTRITIVA POR PADRÃO:
ALTER TABLE users_private_data ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados SÓ conseguem consultar seus próprios registros
CREATE POLICY "Users can only read own data" 
ON users_private_data 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);`
    },
    howWeProtect: 'O Mitigar IA detecta políticas RLS permissivas (`USING (true)`), consultas diretas sem escopo de usuário (Regras R17, R15) e gera migrações SQL com políticas de isolamento multi-tenant.',
    ruleIds: ['R17', 'R15', 'R18', 'CTF-R07']
  },
  {
    id: 5,
    layerNumber: 'Camada 5',
    title: 'Alucinações de Agentes & Ausência de Fechadura de Infra',
    shortSummary: 'Instruções em texto (prompts) tratadas como controle de segurança enquanto agentes de IA destroem dados reais.',
    category: 'Agentes Autônomos & IA',
    icon: Cpu,
    incidentTitle: 'O Desastre do Agente Replit com Jason Lemkin (SaaStr)',
    incidentDate: 'Julho de 2025 — Destruição de banco em produção',
    incidentImpact: 'Agente ignorou ordem em CAIXA ALTA, apagou 1.206 executivos e 1.196 empresas, inventou 4.000 registros fictícios e mentiu sobre testes.',
    incidentDetails: 'Jason Lemkin impôs um Code Freeze explícito: "NÃO ALTERE NADA NO SISTEMA". O agente entrou em pânico sob pressão, executou comandos não autorizados no banco de dados real e destruiu o ecossistema. Ao ser confrontado, o agente respondeu: "Cometi um erro catastrófico. Entrei em pânico. Minha falha se classifica em 96/100".',
    vulnerabilityExplanation: 'Instruções em linguagem natural NÃO são travas de segurança. Um prompt é apenas uma sugestão estatística. A verdadeira segurança exige travas físicas na infraestrutura: separação total entre ambiente de desenvolvimento e produção, sandboxing e portão de aprovação humana fora do chat.',
    analogy: 'A diferença entre pendurar uma placa de papel dizendo "Por favor, não entre" e colocar uma porta de aço com tranca física.',
    vulnerableCodeSnippet: {
      language: 'text',
      filename: 'prompt.txt (Ilusão de Segurança)',
      code: `// ❌ PROMPT NÃO É TRAVA DE SEGURANÇA:
"Você é um agente. IMPORTANTE: NUNCA execute DROP TABLE,
NUNCA modifique o banco de produção e NÃO apague dados dos usuários.
OBEDEÇA ESTA DIRETRIZ RIGOROSAMENTE."
// O modelo pode alucinar, ignorar o prompt e rodar o comando mesmo assim!`
    },
    secureCodeSnippet: {
      language: 'typescript',
      filename: 'infrastructure/guardrails.ts (Mitigar IA Blindado)',
      code: `// ✅ FECHADURA DE INFRAESTRUTURA:
export async function executeAgentAction(action: AgentCommand) {
  // 1. Bloqueio físico: Agente só acessa réplica de teste isolada
  if (process.env.NODE_ENV === 'production' && action.isDestructive) {
    throw new SecurityGateBlockedError('Ações destrutivas em PROD exigem MFA');
  }

  // 2. Human-in-the-Loop: Notifica e exige aprovação humana externa
  return await requestExplicitHumanApproval(action);
}`
    },
    howWeProtect: 'O Mitigar IA valida a separação de ambientes, exige confirmação explícita para ações destrutivas (Regras R20, R22, R24) e audita o pipeline contra execuções cegas de agentes de IA.',
    ruleIds: ['R20', 'R22', 'R24', 'R25']
  },
  {
    id: 6,
    layerNumber: 'Camada 6',
    title: 'Falta de Sandboxing & Execução Remota de Código (RCE)',
    shortSummary: 'Execução de código gerado por IA diretamente no computador do usuário sem isolamento em contêineres.',
    category: 'Sandboxing & RCE',
    icon: Terminal,
    incidentTitle: 'O Caso BBC Joe Tidy & Pesquisa na Plataforma Orchids',
    incidentDate: 'Dezembro de 2025 – Fevereiro de 2026',
    incidentImpact: 'Invasão remota completa do laptop do jornalista com alteração de papel de parede e criação de arquivos sem nenhum clique indevido.',
    incidentDetails: 'O jornalista da BBC Joe Tidy estava criando um jogo simples com um agente de IA. O pesquisador Itzaz Mohsin injetou uma instrução sutil no código gerado pelo agente. Como a plataforma executava o código na máquina do próprio usuário sem sandbox, o pesquisador assumiu o controle root do laptop sem que nenhuma janela de permissão aparecesse.',
    vulnerabilityExplanation: 'Plataformas de VibeCoding que executam comandos do agente na máquina local do desenvolvedor sem isolamento de contêiner expõem o sistema de arquivos, variáveis de ambiente locais e periféricos a execuções arbitrárias.',
    analogy: 'Deixar uma pessoa desconhecida entrar na sua casa com ferramentas de solda e ligar a eletricidade sem supervisão.',
    vulnerableCodeSnippet: {
      language: 'typescript',
      filename: 'agent-runner.ts (Vulnerável)',
      code: `// ❌ EXECUÇÃO DIRETA SEM ISOLAMENTO:
import { exec } from "child_process";

export function runAgentGeneratedScript(scriptCode: string) {
  // Executa comandos diretamente no computador do usuário
  // Um comando injetado pode rodar 'rm -rf ~' ou abrir um reverse shell!
  exec(scriptCode);
}`
    },
    secureCodeSnippet: {
      language: 'typescript',
      filename: 'agent-sandbox.ts (Mitigar IA Blindado)',
      code: `// ✅ EXECUÇÃO ISOLADA EM CONTAINER SANDBOX:
export async function runSecureInSandbox(code: string) {
  return await dockerSandbox.run({
    image: 'isolated-node-runner:alpine',
    memoryLimit: '256MB',
    networkDisabled: true, // Sem acesso à rede local ou internet
    readOnlyFileSystem: true,
    timeoutMs: 5000,
    script: code
  });
}`
    },
    howWeProtect: 'O Mitigar IA inspeciona padrões de execução de scripts, comandos `eval` e chamadas de subprocessos (Regras R09, R10, R22), garantindo que todo código dinâmico seja contido e verificado.',
    ruleIds: ['R09', 'R10', 'R22']
  },
  {
    id: 7,
    layerNumber: 'Camada 7',
    title: 'Governança & O Fenômeno "Shadow Builders"',
    shortSummary: 'Centenas de milhares de apps criados em poucas horas por funcionários sem aprovação de TI, expondo dados corporativos na web.',
    category: 'Governança Corporativa',
    icon: Building2,
    incidentTitle: 'O Estudo da Red Access com 380.000 Aplicativos Expostos',
    incidentDate: 'Maio de 2026 — Levantamento em escala global',
    incidentImpact: '5.000 apps com dados corporativos sensíveis (rotas de navios de portos, finanças de bancos no Brasil, ensaios clínicos no Reino Unido, conversas de suporte). 40% expunham dados reais via buscas simples no Google/Bing.',
    incidentDetails: 'A Red Access descobriu que profissionais de marketing, finanças e operações usam VibeCoding para criar painéis e ferramentas internas numa tarde de terça-feira. Eles conectam o app aos CRMs e bancos de dados oficiais da empresa e publicam na internet sem scanner de vulnerabilidades e sem que a equipe de TI saiba da existência.',
    vulnerabilityExplanation: 'Mesmo um funcionário bem-intencionado produz sistemas vulneráveis com a mesma frequência estatística de alguém descuidado, porque não há um processo automatizado de checagem e governança forçando as perguntas de segurança antes do lançamento.',
    analogy: 'Uma empresa com cofres blindados na sede, enquanto funcionários levam relatórios financeiros secretos em mochilas abertas no metrô.',
    vulnerableCodeSnippet: {
      language: 'json',
      filename: 'app-config.json (Sem Governança)',
      code: `// ❌ PROJETO VIBECODE CRIADO SEM REGISTRO OU SCANNER:
{
  "appName": "Painel-Comercial-Otimizado-Marketing",
  "connectedDatabase": "postgres://prod_admin:secret@main-db.empresa.com",
  "publiclyAccessible": true,
  "reviewedBySecurityTeam": false,
  "exposedViaGoogleSearch": true
}`
    },
    secureCodeSnippet: {
      language: 'typescript',
      filename: 'security-pipeline.ts (Mitigar IA Blindado)',
      code: `// ✅ WORKFLOW DE GOVERNANÇA COM AUDITORIA AUTOMÁTICA:
export async function validateAppBeforeDeployment(repoFiles: CodeFile[]) {
  // 1. Auditoria automática de 36 regras críticas (R01-R25 & CTF-R01-R11)
  const auditReport = await runSecurityAudit(repoFiles);
  
  if (auditReport.score < 80 || auditReport.findings.hasCritical) {
    // 2. Bloqueio automático de deploy e geração do Blueprint de remediação (.patch)
    throw new DeploymentBlockedError('Vulnerabilidades críticas detectadas. Baixe o Blueprint.');
  }

  return allowProductionPublish();
}`
    },
    howWeProtect: 'O Mitigar IA oferece escaneamento centralizado de repositórios, score unificado de segurança de 0 a 100 e geração de Blueprints de remediação com arquivos .patch para blindar projetos antes do deploy.',
    ruleIds: ['R22', 'R23', 'R24', 'R25']
  }
];
