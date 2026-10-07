-- CreateTable
CREATE TABLE "clube" (
    "id_clube" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'geral',
    "tag" TEXT,
    "id_criador" INTEGER,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clube_id_criador_fkey" FOREIGN KEY ("id_criador") REFERENCES "usuario" ("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "clube_membro" (
    "id_clube" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'membro',
    "entrou_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id_clube", "id_usuario"),
    CONSTRAINT "clube_membro_id_clube_fkey" FOREIGN KEY ("id_clube") REFERENCES "clube" ("id_clube") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "clube_membro_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "clube_mensagem" (
    "id_mensagem" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_clube" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clube_mensagem_id_clube_fkey" FOREIGN KEY ("id_clube") REFERENCES "clube" ("id_clube") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "clube_mensagem_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "clube_nome_key" ON "clube"("nome");

-- CreateIndex
CREATE INDEX "clube_membro_id_usuario_idx" ON "clube_membro"("id_usuario");

-- CreateIndex
CREATE INDEX "clube_mensagem_id_clube_id_mensagem_idx" ON "clube_mensagem"("id_clube", "id_mensagem");