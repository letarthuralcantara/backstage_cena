import { z } from "zod";

export const WORKON_TIPOS = ["album", "ep", "single", "beat_tape", "outro"] as const;
export const WORKON_STATUS = ["ideia", "producao", "mixagem", "finalizado", "lancado"] as const;
export const WORKON_VISIBILIDADES = ["publico", "link"] as const;
export const WORKON_PAPEIS = ["editor", "ouvinte"] as const;

const idWorkon = z.object({
  id: z.coerce.number().int().positive("O id do work on deve ser positivo"),
});

export const workOnParamsSchema = z.object({ params: idWorkon });

export const workOnUsuarioSchema = z.object({
  params: z.object({
    id_usuario: z.coerce.number().int().positive("O id do usuário deve ser positivo"),
  }),
});

export const listarWorkOnSchema = z.object({
  query: z
    .object({
      q: z.string().trim().max(80).optional(),
      status: z.enum(WORKON_STATUS).optional(),
      genero: z.string().trim().max(80).optional(),
      tipo: z.enum(WORKON_TIPOS).optional(),
      cursor: z.coerce.number().int().min(0).optional(),
      limite: z.coerce.number().int().min(1).max(50).optional(),
    })
    .strict(),
});

export const criarWorkOnSchema = z.object({
  body: z
    .object({
      titulo: z.string().trim().min(3, "O título deve ter ao menos 3 caracteres").max(80, "O título deve ter no máximo 80 caracteres"),
      descricao: z.string().trim().max(500, "A descrição deve ter no máximo 500 caracteres").optional(),
      tipo: z.enum(WORKON_TIPOS, { message: "Tipo de projeto inválido." }),
      status: z.enum(WORKON_STATUS, { message: "Status inválido." }).optional(),
      visibilidade: z.enum(WORKON_VISIBILIDADES, { message: "Visibilidade inválida." }).optional(),
      token_convite: z.string().trim().max(120).optional(),
      icone: z.string().trim().max(8).optional(),
      daw: z.string().trim().max(60).optional(),
      genero: z.string().trim().max(60).optional(),
      prazo: z.coerce.date().optional(),
      notas: z.string().trim().max(20000, "As notas devem ter no máximo 20000 caracteres").optional(),
    })
    .strict(),
});

export const atualizarWorkOnSchema = z.object({
  params: idWorkon,
  body: z
    .object({
      titulo: z.string().trim().min(3).max(80).optional(),
      descricao: z.string().trim().max(500).optional(),
      tipo: z.enum(WORKON_TIPOS).optional(),
      status: z.enum(WORKON_STATUS).optional(),
      visibilidade: z.enum(WORKON_VISIBILIDADES).optional(),
      token_convite: z.string().trim().max(120).nullable().optional(),
      icone: z.string().trim().max(8).nullable().optional(),
      daw: z.string().trim().max(60).nullable().optional(),
      genero: z.string().trim().max(60).nullable().optional(),
      prazo: z.coerce.date().nullable().optional(),
      notas: z.string().trim().max(20000).nullable().optional(),
    })
    .strict(),
});

export const entrarWorkOnSchema = z.object({ params: idWorkon });
export const entrarPorConviteSchema = z.object({ body: z.object({ token: z.string().trim().min(1).max(120) }).strict() });
export const conviteSchema = z.object({ params: idWorkon });

export const membroWorkOnSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive("O id do work on deve ser positivo") }),
  body: z.object({ id_usuario: z.coerce.number().int().positive("O id do usuário deve ser positivo"), papel: z.enum(WORKON_PAPEIS, { message: "Papel inválido." }) }).strict(),
});

export const atualizarMembroWorkOnSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive("O id do work on deve ser positivo"), id_usuario: z.coerce.number().int().positive("O id do usuário deve ser positivo") }),
  body: z.object({ papel: z.enum(WORKON_PAPEIS, { message: "Papel inválido." }) }).strict(),
});

export const faixaWorkOnSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive("O id do work on deve ser positivo"), idFaixa: z.coerce.number().int().positive("O id da faixa deve ser positivo").optional() }),
  body: z.object({ titulo: z.string().trim().min(1).max(80).optional(), ordem: z.coerce.number().int().min(0).optional(), bpm: z.coerce.number().int().min(40).max(300).optional(), tom: z.string().trim().max(20).optional(), notas: z.string().trim().max(5000).optional() }).strict(),
});

export const reordenarFaixasSchema = z.object({
  params: idWorkon,
  body: z.object({ ids: z.array(z.coerce.number().int().positive("Cada id deve ser positivo")).min(1) }).strict(),
});

export const reordenarTarefasSchema = z.object({
  params: idWorkon,
  body: z.object({ ids: z.array(z.coerce.number().int().positive("Cada id deve ser positivo")).min(1) }).strict(),
});

export const reordenarFotosSchema = z.object({
  params: idWorkon,
  body: z.object({ ids: z.array(z.coerce.number().int().positive("Cada id deve ser positivo")).min(1) }).strict(),
});

export const versaoWorkOnSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive("O id do work on deve ser positivo"), idFaixa: z.coerce.number().int().positive("O id da faixa deve ser positivo") }),
  body: z.object({ rotulo: z.string().trim().max(80).optional(), observacao: z.string().trim().max(500).optional() }).strict(),
  file: z.object({ mimetype: z.string(), size: z.number().max(50 * 1024 * 1024) }).optional(),
});

export const urlVersaoWorkOnSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive("O id do work on deve ser positivo"),
    idVersao: z.coerce.number().int().positive("O id da versão deve ser positivo"),
  }),
});

export const tarefaWorkOnSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive("O id do work on deve ser positivo"), idTarefa: z.coerce.number().int().positive("O id da tarefa deve ser positivo").optional() }),
  body: z.object({ texto: z.string().trim().min(1).max(200).optional(), feita: z.coerce.boolean().optional(), prazo: z.coerce.date().nullable().optional(), ordem: z.coerce.number().int().min(0).optional(), id_responsavel: z.coerce.number().int().positive().nullable().optional() }).strict(),
});

export const fotoWorkOnSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive("O id do work on deve ser positivo") }),
  body: z.object({ legenda: z.string().trim().max(220).optional() }).strict(),
});

export const capaWorkOnSchema = z.object({ params: idWorkon, file: z.object({ mimetype: z.string(), size: z.number().max(2 * 1024 * 1024) }).optional() });

export const publicarPreviaSchema = z.object({
  params: idWorkon,
  body: z.object({ confirmar: z.coerce.boolean().optional() }).strict(),
});

export const compartilharEmClubeSchema = z.object({
  params: idWorkon,
  body: z.object({ id_clube: z.coerce.number().int().positive("O id do clube deve ser positivo") }).strict(),
});

export const semEntradaSchema = z.object({
  body: z.object({}).strict().optional().default({}),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});
