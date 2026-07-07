// Seed: cria o usuário admin inicial e popula a tabela scoring_rules a partir
// da configuração (form-schema). Rode com: npm run db:seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SCORED_QUESTIONS } from "../src/lib/form-schema";

const prisma = new PrismaClient();

async function main() {
  // ---- Admin inicial ----
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@clinica.com";
  const senha = process.env.SEED_ADMIN_PASSWORD ?? "MudarEsta@Senha123";
  const nome = process.env.SEED_ADMIN_NAME ?? "Administrador";

  const senhaHash = await bcrypt.hash(senha, 10);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { nome, email, senhaHash, papel: "admin" },
  });
  console.log(`✔ Admin garantido: ${email}`);

  // ---- Regras de pontuação ----
  let count = 0;
  for (const q of SCORED_QUESTIONS) {
    for (const opt of q.options) {
      await prisma.scoringRule.upsert({
        where: { campo_resposta: { campo: q.campo, resposta: opt.code } },
        update: { valor: opt.valor ?? 0, peso: q.peso },
        create: { campo: q.campo, resposta: opt.code, valor: opt.valor ?? 0, peso: q.peso, ativo: true },
      });
      count++;
    }
  }
  console.log(`✔ ${count} regras de pontuação sincronizadas`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
