import { z } from "zod";

export const TIPOS_AUDIO_PERMITIDOS = [
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
] as const;
export const TAMANHO_AUDIO_MAX_BYTES = 15 * 1024 * 1024;

export const arquivoAudioSchema = z.object({
  mimetype: z.enum(TIPOS_AUDIO_PERMITIDOS, {
    message: "Formato de áudio não suportado. Use mp3, wav, m4a ou ogg.",
  }),
  size: z
    .number()
    .max(TAMANHO_AUDIO_MAX_BYTES, "O arquivo excede o limite de 15 MB."),
});

const idParams = z.object({
  id: z.coerce.number().int().positive("O id deve ser um número positivo"),
});

const usuarioParams = z.object({
  id_usuario: z.coerce
    .number()
    .int()
    .positive("O id do usuário deve ser positivo"),
});

export const postagemParamsSchema = z.object({ params: idParams });
export const postagemUsuarioSchema = z.object({ params: usuarioParams });
export const postagemBodySchema = z
  .object({
    titulo: z
      .string()
      .trim()
      .max(60, "O título deve ter no máximo 60 caracteres")
      .optional(),
    inicio_seg: z.coerce.number().int().min(0).max(3600).optional(),
    duracao_seg: z.coerce.number().int().min(1).max(60).optional(),
  })
  .strict();
export const criarPostagemSchema = z.object({
  body: postagemBodySchema,
  file: arquivoAudioSchema,
});

export const tweetParamsSchema = z.object({ params: idParams });
export const tweetUsuarioSchema = z.object({ params: usuarioParams });
export const criarTweetSchema = z.object({
  body: z
    .object({
      texto: z
        .string()
        .trim()
        .min(1, "O tweet não pode ficar vazio.")
        .max(280, "O tweet deve ter no máximo 280 caracteres"),
      expirar: z.boolean().optional().default(false),
    })
    .strict(),
});

export const semEntradaSchema = z.object({
  body: z.object({}).strict().optional().default({}),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});
