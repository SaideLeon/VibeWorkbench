/**
 * Etapa 1: Preparar o Terreno da Auditoria
 * Fonte: E-book "Auditoria de Segurança para Vibe Coding" (Página 4)
 * 
 * "Antes de procurar falhas, reúna o que precisa estar na mesa. Auditar sem contexto é chutar."
 * 
 * Mapeamento obrigatório dos 6 eixos críticos:
 * 1. Autenticação: Rotas de autenticação, incluindo login, cadastro, recuperação de senha e OTP.
 * 2. Autorização: Middlewares de autorização e sessão.
 * 3. Banco de Dados: Queries e acesso ao banco de dados.
 * 4. Financeiro: Qualquer rota que mexa com dinheiro, saldo ou pagamento.
 * 5. Uploads: Endpoints de upload de arquivos.
 * 6. Secrets: Variáveis de ambiente e onde os secrets são carregados.
 * 
 * Exercício 1: Mapear a existência e localização exata de cada um dos 6 eixos no repositório.
 */

import { AuditTerrainMap, TerrainAxis } from '@/types';

export interface FileEntry {
  path: string;
  content: string;
}

export function prepareAuditTerrain(files: FileEntry[], projectName: string = 'Projeto'): AuditTerrainMap {
  const autenticacaoFiles: { path: string; reason: string }[] = [];
  const autorizacaoFiles: { path: string; reason: string }[] = [];
  const bancoDeDadosFiles: { path: string; reason: string }[] = [];
  const financeiroFiles: { path: string; reason: string }[] = [];
  const uploadsFiles: { path: string; reason: string }[] = [];
  const secretsFiles: { path: string; reason: string }[] = [];

  for (const file of files) {
    const p = file.path.toLowerCase();
    const c = file.content || '';

    // 1. Eixo: Autenticação (Login, Cadastro, Recuperação, OTP, Senhas)
    let isAuth = false;
    let authReason = '';
    if (
      p.includes('login') || p.includes('signin') || p.includes('signup') || p.includes('register') ||
      p.includes('auth') || p.includes('password') || p.includes('otp') || p.includes('mfa') ||
      p.includes('recovery') || p.includes('forgot')
    ) {
      isAuth = true;
      authReason = 'Rota ou módulo com nomenclatura explícita de autenticação/credenciais';
    } else if (
      c.includes('signInWith') || c.includes('verifyPassword') || c.includes('createHash') ||
      c.includes('bcrypt') || c.includes('argon2') || c.includes('scrypt') ||
      c.includes('generateOtp') || c.includes('supabase.auth') || c.includes('next-auth')
    ) {
      isAuth = true;
      authReason = 'Manipulação de fluxo de autenticação, hashing de senhas ou geração de OTP';
    }
    if (isAuth) {
      autenticacaoFiles.push({ path: file.path, reason: authReason });
    }

    // 2. Eixo: Autorização (Middlewares, Guards, Sessão, RLS, RBAC)
    let isAutz = false;
    let autzReason = '';
    if (
      p.includes('middleware') || p.includes('guard') || p.includes('rbac') ||
      p.includes('permission') || p.includes('policy') || p.includes('session') ||
      p.includes('role') || p.includes('rls')
    ) {
      isAutz = true;
      autzReason = 'Ficheiro de controle de sessão, guard ou middleware de autorização';
    } else if (
      c.includes('jwt.verify') || c.includes('requireAuth') || c.includes('hasRole(') ||
      c.includes('req.user') || c.includes('getSession(') || c.includes('ENABLE ROW LEVEL SECURITY') ||
      c.includes('CREATE POLICY') || c.includes('canAccess')
    ) {
      isAutz = true;
      autzReason = 'Verificação de permissão de usuário, validação de token ou políticas RLS';
    }
    if (isAutz) {
      autorizacaoFiles.push({ path: file.path, reason: autzReason });
    }

    // 3. Eixo: Banco de Dados (Queries, Schemas, ORMs, Conexões)
    let isDb = false;
    let dbReason = '';
    if (
      p.includes('db') || p.includes('database') || p.includes('prisma') ||
      p.includes('drizzle') || p.includes('schema') || p.includes('migration') ||
      p.includes('models') || p.includes('entities') || p.includes('repository') || p.includes('dao')
    ) {
      isDb = true;
      dbReason = 'Estrutura de dados, modelagem, migração ou conexão direta com banco de dados';
    } else if (
      c.includes('PrismaClient') || c.includes('drizzle(') || c.includes('new Pool(') ||
      c.includes('SELECT ') || c.includes('INSERT INTO') || c.includes('UPDATE ') ||
      c.includes('DELETE FROM') || c.includes('mongoose.model') || c.includes('db.query')
    ) {
      isDb = true;
      dbReason = 'Execução de queries SQL, inicialização de pool ou cliente ORM';
    }
    if (isDb) {
      bancoDeDadosFiles.push({ path: file.path, reason: dbReason });
    }

    // 4. Eixo: Financeiro (Dinheiro, Saldo, Pagamentos, Checkout, Reembolsos)
    let isFin = false;
    let finReason = '';
    if (
      p.includes('payment') || p.includes('checkout') || p.includes('billing') ||
      p.includes('stripe') || p.includes('pix') || p.includes('wallet') ||
      p.includes('balance') || p.includes('refund') || p.includes('invoice') ||
      p.includes('order') || p.includes('cart') || p.includes('pagamento') || p.includes('saldo')
    ) {
      isFin = true;
      finReason = 'Rota ou módulo de pagamento, cobrança, carteira ou gestão de saldo';
    } else if (
      c.includes('stripe.paymentIntents') || c.includes('stripe.charges') ||
      c.includes('balance') || c.includes('saldo') || c.includes('reembolso') ||
      c.includes('amount') || c.includes('transaction') || c.includes('mercadopago')
    ) {
      isFin = true;
      finReason = 'Processamento financeiro, cálculo de valores monetários ou integração com gateway';
    }
    if (isFin) {
      financeiroFiles.push({ path: file.path, reason: finReason });
    }

    // 5. Eixo: Uploads (Storage, Envio de Arquivos, Mídia)
    let isUpload = false;
    let uploadReason = '';
    if (
      p.includes('upload') || p.includes('storage') || p.includes('s3') ||
      p.includes('multer') || p.includes('file') || p.includes('media') ||
      p.includes('attachment') || p.includes('avatar')
    ) {
      isUpload = true;
      uploadReason = 'Módulo ou rota dedicada a ingestão e armazenamento de arquivos';
    } else if (
      c.includes('multer(') || c.includes('multipart/form-data') || c.includes('busboy') ||
      c.includes('formidable') || c.includes('S3Client') || c.includes('putObject') ||
      c.includes('FileReader') || c.includes('Buffer.from')
    ) {
      isUpload = true;
      uploadReason = 'Manipulação de fluxos de upload, leitura de streams ou cliente S3/Storage';
    }
    if (isUpload) {
      uploadsFiles.push({ path: file.path, reason: uploadReason });
    }

    // 6. Eixo: Secrets (Variáveis de Ambiente, Configurações, Chaves)
    let isSecret = false;
    let secretReason = '';
    if (
      p.includes('.env') || p.includes('env.ts') || p.includes('env.js') || p.includes('env.mjs') ||
      p.includes('config') || p.includes('secrets') || p.includes('credentials') || p.includes('appsettings')
    ) {
      isSecret = true;
      secretReason = 'Arquivo de configuração de ambiente ou manifesto de credenciais';
    } else if (
      c.includes('process.env') || c.includes('import.meta.env') || c.includes('dotenv') ||
      c.includes('API_KEY') || c.includes('SECRET_KEY') || c.includes('DATABASE_URL')
    ) {
      isSecret = true;
      secretReason = 'Leitura e carregamento de variáveis de ambiente e segredos de aplicação';
    }
    if (isSecret) {
      secretsFiles.push({ path: file.path, reason: secretReason });
    }
  }

  const axes: AuditTerrainMap['axes'] = {
    autenticacao: {
      id: 'autenticacao',
      name: 'Autenticação',
      categoryName: 'Rotas de Login, Cadastro, Recuperação e OTP',
      description: 'Rotas e fluxos que autenticam utilizadores, geram tokens ou recuperam credenciais.',
      exists: autenticacaoFiles.length > 0,
      fileCount: autenticacaoFiles.length,
      files: autenticacaoFiles,
    },
    autorizacao: {
      id: 'autorizacao',
      name: 'Autorização',
      categoryName: 'Middlewares de Sessão, Guards e Políticas RLS',
      description: 'Mecanismos que validam se o utilizador autenticado possui permissão para aceder aos recursos.',
      exists: autorizacaoFiles.length > 0,
      fileCount: autorizacaoFiles.length,
      files: autorizacaoFiles,
    },
    bancoDeDados: {
      id: 'bancoDeDados',
      name: 'Banco de Dados',
      categoryName: 'Queries, Schemas, ORM e Acesso a Dados',
      description: 'Camada de persistência, schemas, queries SQL e conexões a bases de dados.',
      exists: bancoDeDadosFiles.length > 0,
      fileCount: bancoDeDadosFiles.length,
      files: bancoDeDadosFiles,
    },
    financeiro: {
      id: 'financeiro',
      name: 'Financeiro',
      categoryName: 'Rotas de Saldo, Pagamento e Transações',
      description: 'Qualquer rota que mexa com dinheiro, saldo, pagamentos, carteira ou créditos.',
      exists: financeiroFiles.length > 0,
      fileCount: financeiroFiles.length,
      files: financeiroFiles,
    },
    uploads: {
      id: 'uploads',
      name: 'Uploads',
      categoryName: 'Endpoints de Upload e Storage de Arquivos',
      description: 'Rotas de recepção, validação e armazenamento de ficheiros e mídias.',
      exists: uploadsFiles.length > 0,
      fileCount: uploadsFiles.length,
      files: uploadsFiles,
    },
    secrets: {
      id: 'secrets',
      name: 'Secrets',
      categoryName: 'Variáveis de Ambiente e Gestão de Chaves',
      description: 'Carregamento e gestão de variáveis de ambiente, tokens de API e credenciais.',
      exists: secretsFiles.length > 0,
      fileCount: secretsFiles.length,
      files: secretsFiles,
    },
  };

  const coveredAxesCount = Object.values(axes).filter((a) => a.exists).length;

  const summary = `Etapa 1 concluída: ${coveredAxesCount} de 6 eixos críticos identificados no repositório (${files.length} ficheiros analisados).`;

  return {
    projectName,
    totalFilesAnalyzed: files.length,
    coveredAxesCount,
    axes,
    summary,
  };
}

/** Formata o Mapa de Terreno da Etapa 1 como texto para os prompts da IA */
export function formatTerrainMapForPrompt(terrain: AuditTerrainMap): string {
  const lines: string[] = [
    `=== MAPA DO TERRENO DA AUDITORIA (ETAPA 1 - E-BOOK VIBE CODING) ===`,
    `Projeto: ${terrain.projectName} | Total de Ficheiros no Escopo: ${terrain.totalFilesAnalyzed}`,
    `Eixos Críticos Detectados: ${terrain.coveredAxesCount}/6`,
    ``,
  ];

  for (const axis of Object.values(terrain.axes)) {
    const status = axis.exists ? `[PRESENTE - ${axis.fileCount} ficheiro(s)]` : `[NÃO DETECTADO]`;
    lines.push(`• ${axis.name.toUpperCase()} (${axis.categoryName}): ${status}`);
    if (axis.exists && axis.files.length > 0) {
      const sampleFiles = axis.files.slice(0, 6).map(f => `    - ${f.path} (${f.reason})`).join('\n');
      lines.push(sampleFiles);
      if (axis.files.length > 6) {
        lines.push(`    - ... e mais ${axis.files.length - 6} ficheiro(s)`);
      }
    }
  }

  lines.push(``);
  lines.push(`DIRETRIZ DA ETAPA 1: O mapa acima define as superfícies de ataque prioritárias. Ao auditar as Etapas 2 a 7, correlacione cada regra violada com seu respectivo eixo mapeado.`);
  return lines.join('\n');
}
