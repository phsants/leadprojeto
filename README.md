# Qualifica Leads

Protótipo funcional de **qualificação e priorização de leads** (cirurgia plástica).
Recebe um formulário público de pré-avaliação, calcula um **score ponderado**, classifica o
lead (A/B/C/D), aplica **regras de exceção** e gera uma **recomendação operacional** para a
equipe — sem nunca expor o score ao lead.

> O sistema **não** fornece diagnóstico, indicação/contraindicação cirúrgica, orçamento
> definitivo ou qualquer decisão médica. Sua função é organizar o primeiro contato.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **PostgreSQL** via **Prisma**
- Autenticação por sessão JWT (cookie httpOnly) com `jose` + `bcryptjs`
- Gráficos com `recharts`
- **Docker** (build no EasyPanel)

## Estrutura da lógica

Implementa a **Matriz de classificação v1.0** (Documento técnico-funcional v2, congelada em 12/09/2026).

- Fórmula: `score_total = Σ (peso × valor)` dos 8 critérios pontuados, máximo **54 pontos**.
  O percentual (`score_total / 54`) é só exibição, com 1 casa decimal.
- Classificação por **escore absoluto** (nunca pelo percentual):
  **A** 41–54 · **B** 27–40 · **C** 14–26 · **D** 0–13.
- Perguntas que pontuam: Q2, Q3, Q4, Q5, Q6, Q7, Q8, Q10. Q1 (procedimento) e Q9 (canal) são só segmentação/KPI.
- Ordem de processamento: validar obrigatórios/consentimentos → subtotais/total → classe pelo total →
  sobrescritas → flags → recomendação → persistir (`matrix_version`, `classificacao_por_score`,
  `classificacao` = classe final, `override_reason`, `flags`).
- Exceções: "não quero ser contatado" força classe final **D** (score preservado, motivo gravado);
  flags `lead_educacional`, `baixa_disponibilidade`, `necessita_abordagem_educativa`, `avaliar_fluxo_reparador`
  não alteram score nem classe.
- **Lead incompleto**: formulário público rejeita submissão incompleta; importação com campo obrigatório
  ou consentimento ausente grava `classificacao = incompleto` (sem classe A–D) e flag `registro_incompleto`.
- Fonte única da verdade dos pesos/valores: [`src/lib/form-schema.ts`](src/lib/form-schema.ts).
  Motor: [`src/lib/scoring.ts`](src/lib/scoring.ts). **Pesos bloqueados na v1.0**: a tabela `scoring_rules`
  é só registro auditável (o motor não a lê); alterar exige nova versão, data, justificativa e novos testes.
- Testes da matriz (casos-limite, sobrescrita, flags, incompleto) e dos provedores de IA: `npm test`.

## Assistente de IA (`/admin`)

Chat com dados **anonimizados** dos leads e ação de mudar status por function calling.
Provedores, em ordem ([`src/lib/ai`](src/lib/ai)):

1. **Gemini** (gratuito) — `GEMINI_API_KEY`. Erros transitórios (429/5xx/rede) são retentados
   3 vezes com espera; se o modelo principal (`GEMINI_MODEL`, padrão `gemini-flash-latest`)
   continuar fora, usa o reserva da mesma chave (`GEMINI_FALLBACK_MODEL`, padrão `gemini-flash-lite-latest`).
2. **Groq** (gratuito, API compatível com OpenAI) — só entra quando o Gemini esgota as tentativas.
   Ligue com `GROQ_API_KEY` (chave em console.groq.com); modelo em `GROQ_MODEL` (padrão `llama-3.3-70b-versatile`).

A conversa é mantida num formato neutro (`provider.ts`), então a troca de provedor pode acontecer
no meio de uma sequência de ferramentas sem perder o contexto.

## Rodando localmente

### Opção A — Docker Compose (app + Postgres juntos)

```bash
docker compose up --build
```

App em http://localhost:3000 · Painel em http://localhost:3000/admin
Login inicial: `admin@clinica.com` / `MudarEsta@Senha123` (troque em produção).

### Opção B — Node local

```bash
cp .env.example .env      # ajuste DATABASE_URL e AUTH_SECRET
npm install
npx prisma db push        # cria as tabelas
npm run db:seed           # cria admin + regras de score
npm run dev
```

## Deploy no EasyPanel (VPS Hostinger)

1. Suba este repositório no GitHub.
2. No EasyPanel, crie um serviço **PostgreSQL** (anote a connection string interna).
3. Crie um **App** apontando para o repositório, tipo de build **Dockerfile**.
4. Configure as variáveis de ambiente do App:
   - `DATABASE_URL` = string interna do Postgres do EasyPanel
   - `AUTH_SECRET` = valor aleatório longo (ex.: `openssl rand -base64 48`)
   - `RUN_SEED` = `true` (apenas no primeiro deploy, para criar admin + regras)
   - `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`
   - `NODE_ENV` = `production`
5. Faça o deploy. O container roda `prisma db push` (aplica o schema) e sobe o app na porta **3000**.
6. Após o primeiro deploy, defina `RUN_SEED=false` para não re-rodar o seed a cada boot.
7. Aponte o domínio no EasyPanel (HTTPS automático via Let's Encrypt).

## Rotas de API

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/api/leads` | Recebe o formulário, calcula score e salva (não retorna score) |
| POST | `/api/auth/login` · `/logout` | Sessão do painel |
| GET | `/api/admin/leads` | Lista com filtros |
| GET | `/api/admin/leads/:id` | Detalhe |
| PATCH | `/api/admin/leads/:id/status` | Atualiza status (grava histórico) |
| PATCH | `/api/admin/leads/:id/responsavel` | Define responsável |
| GET | `/api/admin/dashboard` | KPIs agregados |
| GET | `/api/admin/export` | Exporta CSV |
| GET/PUT | `/api/admin/scoring-rules` | Lê/edita pesos (PUT apenas admin) |

## Segurança / privacidade

Não coleta dados clínicos, fotos, exames, CPF, idade ou renda. Senhas com hash bcrypt.
Painel protegido por login. Consentimentos de contato e privacidade registrados por lead.
