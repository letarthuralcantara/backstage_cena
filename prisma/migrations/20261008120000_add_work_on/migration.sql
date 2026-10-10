CREATE TABLE "work_on" (
    "id_workon" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_dono" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'outro',
    "status" TEXT NOT NULL DEFAULT 'ideia',
    "visibilidade" TEXT NOT NULL DEFAULT 'publico',
    "token_convite" TEXT,
    "icone" TEXT,
    "capa" TEXT,
    "daw" TEXT,
    "genero" TEXT,
    "prazo" DATETIME,
    "notas" TEXT,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "work_on_id_dono_fkey" FOREIGN KEY ("id_dono") REFERENCES "usuario" ("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "work_on_membro" (
    "id_workon" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'ouvinte',
    "entrou_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id_workon", "id_usuario"),
    CONSTRAINT "work_on_membro_id_workon_fkey" FOREIGN KEY ("id_workon") REFERENCES "work_on" ("id_workon") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "work_on_membro_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "work_on_faixa" (
    "id_faixa" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_workon" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "bpm" INTEGER,
    "tom" TEXT,
    "notas" TEXT,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "work_on_faixa_id_workon_fkey" FOREIGN KEY ("id_workon") REFERENCES "work_on" ("id_workon") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "work_on_versao" (
    "id_versao" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_faixa" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "rotulo" TEXT,
    "observacao" TEXT,
    "arquivo" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamanho_bytes" INTEGER NOT NULL,
    "id_autor" INTEGER NOT NULL,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("id_faixa", "numero"),
    CONSTRAINT "work_on_versao_id_faixa_fkey" FOREIGN KEY ("id_faixa") REFERENCES "work_on_faixa" ("id_faixa") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "work_on_versao_id_autor_fkey" FOREIGN KEY ("id_autor") REFERENCES "usuario" ("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "work_on_tarefa" (
    "id_tarefa" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_workon" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "feita" INTEGER NOT NULL DEFAULT 0,
    "prazo" DATETIME,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "id_responsavel" INTEGER,
    CONSTRAINT "work_on_tarefa_id_workon_fkey" FOREIGN KEY ("id_workon") REFERENCES "work_on" ("id_workon") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "work_on_tarefa_id_responsavel_fkey" FOREIGN KEY ("id_responsavel") REFERENCES "usuario" ("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "work_on_foto" (
    "id_foto" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_workon" INTEGER NOT NULL,
    "caminho" TEXT NOT NULL,
    "legenda" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "id_autor" INTEGER NOT NULL,
    CONSTRAINT "work_on_foto_id_workon_fkey" FOREIGN KEY ("id_workon") REFERENCES "work_on" ("id_workon") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "work_on_foto_id_autor_fkey" FOREIGN KEY ("id_autor") REFERENCES "usuario" ("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "work_on_token_convite_key" ON "work_on"("token_convite");
CREATE INDEX "work_on_id_dono_idx" ON "work_on"("id_dono");
CREATE INDEX "work_on_visibilidade_atualizado_em_idx" ON "work_on"("visibilidade", "atualizado_em");
CREATE INDEX "work_on_membro_id_workon_idx" ON "work_on_membro"("id_workon");
CREATE INDEX "work_on_membro_id_usuario_idx" ON "work_on_membro"("id_usuario");
CREATE INDEX "work_on_faixa_id_workon_idx" ON "work_on_faixa"("id_workon");
CREATE INDEX "work_on_versao_id_faixa_idx" ON "work_on_versao"("id_faixa");
CREATE INDEX "work_on_versao_id_autor_idx" ON "work_on_versao"("id_autor");
CREATE INDEX "work_on_tarefa_id_workon_idx" ON "work_on_tarefa"("id_workon");
CREATE INDEX "work_on_tarefa_id_responsavel_idx" ON "work_on_tarefa"("id_responsavel");
CREATE INDEX "work_on_foto_id_workon_idx" ON "work_on_foto"("id_workon");
CREATE INDEX "work_on_foto_id_autor_idx" ON "work_on_foto"("id_autor");
