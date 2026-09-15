# Conformidade do app com a Matriz de classificação v1.0

Resposta à seção 15 ("Solicitação ao programador") do **Documento técnico-funcional v2** e à planilha
**Matriz mestre definitiva v1.0 — Lead scoring 54 pontos**, recebidos em 12/09/2026.

Data da verificação: 15/09/2026.

## Resumo

O que já estava conforme foi mantido. O que divergia foi ajustado no código. Depois do deploy, o
sistema passa a atender integralmente aos 8 pontos solicitados na seção 15.

| # | Pergunta do documento | Antes | Agora |
|---|---|---|---|
| 1 | Campos e valores coincidem integralmente com a matriz? | **Sim.** As 10 perguntas, todas as alternativas, os pesos (2,3,3,2,2,1,2,3) e os valores conferem 1 a 1 com a planilha. Máximo 54. | Mantido. Teste automatizado confere os 8 subtotais máximos (6,9,9,6,6,3,6,9). |
| 2 | A classe usa limites absolutos? | **Não.** Classificava por percentual (≥75%, ≥50%, ≥25%). Na prática dava o mesmo resultado, mas não era o que o documento exige. | **Sim.** Classe decidida pelo total inteiro: A 41–54, B 27–40, C 14–26, D 0–13. Percentual é só exibição. |
| 3 | O motor preserva classe por score e classe final? | **Não.** Guardava só a classe final. A sobrescrita "não quero contato" apagava a classe original. | **Sim.** Grava `classificacao_por_score`, `classificacao` (final) e `override_reason`. A tela do lead mostra as duas classes e a regra aplicada. |
| 4 | Flags e sobrescritas seguem a ordem definida? | **Quase.** A ordem já era: total → classe → sobrescrita → flags → recomendação. A flag "apenas pesquisando" tinha nome diferente (`lead_informativo`). | **Sim.** Ordem mantida; flag renomeada para `lead_educacional`, como na planilha. Motivo da sobrescrita passa a ser registrado. |
| 5 | Registros guardam `matrix_version`? | **Não.** | **Sim.** Coluna `matrix_version` = "1.0" em todo lead novo. Registros antigos recebem "1.0" na migração de dados. |
| 6 | Pesos podem ser bloqueados na v1.0? | **Parcialmente.** A tela de edição já tinha sido removida, mas o motor ainda lia a tabela `scoring_rules` do banco e deixava ela sobrescrever a matriz. | **Sim.** O motor lê pesos e valores só do código (`form-schema.ts`). A tabela `scoring_rules` fica como registro auditável, com coluna `versao`. |
| 7 | Quais divergências existem no código? | — | Listadas abaixo, todas corrigidas. |
| 8 | Quais testes foram executados? | Nenhum automatizado. | Suíte `npm test` com 15 testes (abaixo). Typecheck e build de produção OK. |

## Divergências encontradas e correções

1. **Classificação por percentual em vez de escore absoluto.** Corrigido em `src/lib/scoring.ts`.
2. **Sem rastreabilidade da sobrescrita.** Novas colunas `classificacao_por_score` e `override_reason`.
3. **Sem versão da matriz nos registros.** Nova coluna `matrix_version` (padrão "1.0").
4. **Pesos ainda podiam ser sobrescritos pelo banco.** Motor deixou de ler `scoring_rules`.
5. **Flag `lead_informativo`** renomeada para `lead_educacional` (nome da planilha).
6. **Categoria "Lead incompleto" não existia.** Importação de CSV com campo obrigatório ou consentimento
   ausente dava classe D com score 0. Agora grava `incompleto` (sem classe A–D), flag `registro_incompleto`
   e recomendação "solicitar complementação". O formulário público já rejeitava submissão incompleta.
7. **Consentimentos não eram lidos na importação.** O modelo de CSV ganhou as colunas "Consentimento de
   contato" e "Ciência de privacidade" (Sim/Não). Sem "Sim" nas duas, o registro é Lead incompleto.
8. **Nomes das faixas e textos de recomendação** alinhados ao documento v2 (Alta prioridade, Prioridade
   intermediária, Baixa prioridade, Informativo/não priorizado).
9. **Exportação CSV** passa a incluir classe por score, classe final, motivo da sobrescrita e versão da matriz.
10. **Assistente de IA** deixa de considerar leads incompletos na fila de "contatar agora".

## O que já estava conforme

- Q1 (procedimento) e Q9 (canal) não pontuam; "reparador" só gera flag.
- "Não quero ser contatado" força classe final D e impede fila ativa.
- Flags de baixa disponibilidade, medo/insegurança e procedimento reparador não alteram o total.
- Formulário público retorna apenas confirmação neutra; o lead nunca vê score, classe ou prioridade.
- Nome e WhatsApp obrigatórios; e-mail e cidade/estado opcionais; consentimentos gravados separadamente.
- Tabelas `users`, `leads`, `lead_status_history` e `scoring_rules` mantidas.

## Testes executados (`npm test`)

Reproduzem a aba "Casos de teste" da planilha e a seção 13 do documento:

- Versão da matriz é 1.0; máximo 54; os 8 subtotais máximos batem com a planilha.
- Limites: 13=D, 14=C, 26=C, 27=B, 40=B, 41=A, 54=A; 0=D.
- Faixas cobrem 0–54 sem buraco nem sobreposição.
- Percentual não muda a classe por arredondamento (checado para todo total de 1 a 54).
- "Não contato": score 45 → classe por score A, classe final D, motivo registrado, flag `nao_acionar_comercialmente`.
- Flags não alteram total nem classe.
- Procedimento e origem alterados não mudam score nem classe.
- Registro incompleto (campo ou consentimento ausente) → sem classe A–D.
- Resposta desconhecida pontua 0 e o total é sempre inteiro.

Observação técnica: o menor total alcançável é **1**, não 0, porque Q7 (contato anterior) não tem
alternativa com valor 0. A faixa D continua definida como 0–13.

## Migração de dados dos registros existentes

Ao subir a nova versão, o container aplica o schema e roda um script idempotente que, nos leads já
gravados, preenche `matrix_version`, `classificacao_por_score` e `override_reason` e renomeia a flag
antiga. **Score e classe final históricos não são alterados**, como exige a seção 11.

## Pontos de atenção

- **Coluna da classe final** continua se chamando `classificacao` no banco (o documento sugere
  `classificacao_final`). Renomear a coluna com o fluxo de deploy atual perderia os dados existentes,
  então mantivemos o nome e documentamos a equivalência.
- **Complementação de lead incompleto:** o sistema marca e lista os campos faltantes, mas ainda não há
  tela para editar as respostas de um lead importado. Hoje o caminho é corrigir o CSV e reimportar.
- **Importação de CSVs antigos** (sem colunas de consentimento) passará a gerar Leads incompletos, como
  o documento exige. Basta adicionar as duas colunas com "Sim".
