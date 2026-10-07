CREATE TABLE "imagem_usuario" (
    "id_imagem" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_usuario" INTEGER NOT NULL,
    "caminho" TEXT NOT NULL,
    CONSTRAINT "imagem_usuario_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "imagem_usuario_id_usuario_key" ON "imagem_usuario"("id_usuario");