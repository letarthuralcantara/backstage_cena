import { z } from "zod";

export const TIPOS_CLUBE = ["genero", "instrumento", "daw", "geral"] as const;

const idClube = z.object({
  id: z.coerce.number().int().positive("O id do clube deve ser positivo"),
});

export const clubeParamsSchema = z.object({ params: idClube });

export const clubeUsuarioSchema = z.object({
  params: z.object({
    id_usuario: z.coerce
      .number()
      .int()
      .positive("O id do usuário deve ser positivo"),
  }),
});

export const listarClubesSchema = z.object({
  query: z
    .object({
      q: z.string().trim().max(60).optional(),
      tipo: z.enum(TIPOS_CLUBE).optional(),
    })
    .strict(),
});

export const recomendadosSchema = z.object({
  query: z
    .object({ limite: z.coerce.number().int().min(1).max(30).optional() })
    .strict(),
});

export const criarClubeSchema = z.object({
  body: z
    .object({
      nome: z
        .string()
        .trim()
        .min(3, "O nome deve ter ao menos 3 caracteres")
        .max(40, "O nome deve ter no máximo 40 caracteres"),
      descricao: z
        .string()
        .trim()
        .max(200, "A descrição deve ter no máximo 200 caracteres")
        .optional(),
      tipo: z.enum(TIPOS_CLUBE, { message: "Tipo de clube inválido." }),
      tag: z
        .string()
        .trim()
        .min(1)
        .max(40, "A tag deve ter no máximo 40 caracteres")
        .optional(),
    })
    .strict()
    .refine((d) => d.tipo === "geral" || Boolean(d.tag), {
      message: "Escolha o gênero, instrumento ou DAW do clube.",
      path: ["tag"],
    }),
});

export const listarMensagensSchema = z.object({
  params: idClube,
  query: z
    .object({ depois: z.coerce.number().int().min(0).optional() })
    .strict(),
});

export const buscaClubeSchema = z.object({
  params: idClube,
  query: z
    .object({
      q: z.string().trim().min(1).max(60),
    })
    .strict(),
});

export const criarMensagemSchema = z.object({
  params: idClube,
  body: z
    .object({
      texto: z
        .string()
        .trim()
        .min(1, "A mensagem não pode ficar vazia.")
        .max(500, "A mensagem deve ter no máximo 500 caracteres"),
    })
    .strict(),
});
