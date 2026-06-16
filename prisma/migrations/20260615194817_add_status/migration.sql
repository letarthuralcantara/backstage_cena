-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_usuario" (
    "id_usuario" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome_completo" TEXT NOT NULL,
    "nome_artistico" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "telefone" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "bairro" TEXT,
    "area_atuacao" TEXT,
    "anos_experiencia" INTEGER NOT NULL DEFAULT 0,
    "biografia" TEXT,
    "cadastro_completo" INTEGER NOT NULL DEFAULT 0,
    "redes_sociais" TEXT,
    "status" TEXT NOT NULL DEFAULT 'online'
);
INSERT INTO "new_usuario" ("anos_experiencia", "area_atuacao", "bairro", "biografia", "cadastro_completo", "cidade", "email", "estado", "id_usuario", "nome_artistico", "nome_completo", "redes_sociais", "senha", "telefone") SELECT "anos_experiencia", "area_atuacao", "bairro", "biografia", "cadastro_completo", "cidade", "email", "estado", "id_usuario", "nome_artistico", "nome_completo", "redes_sociais", "senha", "telefone" FROM "usuario";
DROP TABLE "usuario";
ALTER TABLE "new_usuario" RENAME TO "usuario";
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
