-- Migration inicial gerada a partir de prisma/schema.prisma.
CREATE TABLE "usuario" (
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
    "status" TEXT NOT NULL DEFAULT 'disponivel'
);

CREATE TABLE "postagem" (
    "id_postagem" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_usuario" INTEGER NOT NULL,
    "titulo" TEXT,
    "audio_url" TEXT NOT NULL,
    "inicio_seg" INTEGER NOT NULL DEFAULT 0,
    "duracao_seg" INTEGER NOT NULL DEFAULT 30,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_em" DATETIME NOT NULL,
    CONSTRAINT "postagem_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "disponibilidade" (
    "id_disponibilidade" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "descricao" TEXT NOT NULL
);

CREATE TABLE "usuario_disponibilidade" (
    "id_usuario" INTEGER NOT NULL,
    "id_disponibilidade" INTEGER NOT NULL,
    PRIMARY KEY ("id_usuario", "id_disponibilidade"),
    CONSTRAINT "usuario_disponibilidade_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "usuario_disponibilidade_id_disponibilidade_fkey" FOREIGN KEY ("id_disponibilidade") REFERENCES "disponibilidade" ("id_disponibilidade") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "configuracoes_usuario" (
    "id_config" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_usuario" INTEGER NOT NULL,
    "mostrar_email" INTEGER NOT NULL DEFAULT 1,
    "mostrar_telefone" INTEGER NOT NULL DEFAULT 0,
    "mostrar_redes_sociais" INTEGER NOT NULL DEFAULT 1,
    "perfil_publico" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "configuracoes_usuario_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "instrumento" (
    "id_instrumento" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL
);

CREATE TABLE "genero" (
    "id_genero" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL
);

CREATE TABLE "daw" (
    "id_daw" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL
);

CREATE TABLE "usuario_instrumento" (
    "id_usuario" INTEGER NOT NULL,
    "id_instrumento" INTEGER NOT NULL,
    "principal" INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY ("id_usuario", "id_instrumento"),
    CONSTRAINT "usuario_instrumento_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "usuario_instrumento_id_instrumento_fkey" FOREIGN KEY ("id_instrumento") REFERENCES "instrumento" ("id_instrumento") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "usuario_genero" (
    "id_usuario" INTEGER NOT NULL,
    "id_genero" INTEGER NOT NULL,
    "preferencia" INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY ("id_usuario", "id_genero"),
    CONSTRAINT "usuario_genero_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "usuario_genero_id_genero_fkey" FOREIGN KEY ("id_genero") REFERENCES "genero" ("id_genero") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "usuario_daw" (
    "id_usuario" INTEGER NOT NULL,
    "id_daw" INTEGER NOT NULL,
    PRIMARY KEY ("id_usuario", "id_daw"),
    CONSTRAINT "usuario_daw_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "usuario_daw_id_daw_fkey" FOREIGN KEY ("id_daw") REFERENCES "daw" ("id_daw") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "tweet" (
    "id_tweet" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_usuario" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_em" DATETIME,
    CONSTRAINT "tweet_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");
CREATE UNIQUE INDEX "disponibilidade_descricao_key" ON "disponibilidade"("descricao");
CREATE UNIQUE INDEX "configuracoes_usuario_id_usuario_key" ON "configuracoes_usuario"("id_usuario");
CREATE UNIQUE INDEX "instrumento_nome_key" ON "instrumento"("nome");
CREATE UNIQUE INDEX "genero_nome_key" ON "genero"("nome");
CREATE UNIQUE INDEX "daw_nome_key" ON "daw"("nome");
