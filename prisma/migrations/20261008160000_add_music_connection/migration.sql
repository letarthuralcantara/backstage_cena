CREATE TABLE "conexao_musica" (
    "id_conexao" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_usuario" INTEGER NOT NULL,
    "provedor" TEXT NOT NULL,
    "id_externo" TEXT NOT NULL,
    "nome_exibicao" TEXT NOT NULL,
    "refresh_token_cifrado" TEXT,
    "visibilidade" TEXT NOT NULL DEFAULT 'publico',
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" DATETIME NOT NULL,
    CONSTRAINT "conexao_musica_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "conexao_musica_id_usuario_key" ON "conexao_musica"("id_usuario");
CREATE INDEX "conexao_musica_visibilidade_idx" ON "conexao_musica"("visibilidade");
