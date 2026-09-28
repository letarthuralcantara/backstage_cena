import { z } from "zod";

const listaUnica = (nome: string) =>
  z
    .array(z.string().trim().min(1).max(80))
    .max(50)
    .refine(
      (itens) => new Set(itens.map((item) => item.toLowerCase())).size === itens.length,
      `${nome} contém valores duplicados`,
    )
    .optional();

const bodyCadastro = z
  .object({
    nome_completo: z
      .string()
      .trim()
      .min(3, "O nome completo deve ter no mínimo 3 caracteres")
      .max(120, "O nome completo deve ter no máximo 120 caracteres"),
    nome_artistico: z
      .string()
      .trim()
      .min(2, "O nome artístico deve ter no mínimo 2 caracteres")
      .max(120, "O nome artístico deve ter no máximo 120 caracteres")
      .optional(),
    email: z.string().email("E-mail inválido").max(255),
    senha: z
      .string()
      .min(6, "A senha deve ter no mínimo 6 caracteres")
      .max(128, "A senha deve ter no máximo 128 caracteres"),
    telefone: z.string().max(30).optional().nullable(),
    cidade: z.string().max(120).optional().nullable(),
    estado: z.string().max(50).optional().nullable(),
    bairro: z.string().max(120).optional().nullable(),
    area_atuacao: z.array(z.string().trim().min(1).max(80)).max(10).optional(),
    anos_experiencia: z.number().int().nonnegative().max(100).optional(),
    biografia: z
      .string()
      .trim()
      .min(5, "A biografia deve ter no mínimo 5 caracteres")
      .max(500, "A biografia deve ter no máximo 500 caracteres")
      .optional()
      .nullable(),
    instrumentos: listaUnica("Instrumentos"),
    generos: listaUnica("Gêneros"),
    daws: listaUnica("DAWs"),
    disponibilidades: z
      .array(z.string().trim().min(1).max(80))
      .max(50)
      .optional(),
    redes_sociais: z
      .record(z.string().max(40), z.string().max(2048))
      .nullable()
      .optional(),
    status: z
      .enum(["disponivel", "ocupado", "nao_perturbe", "invisivel"])
      .optional(),
  })
  .strict();

const bodyLogin = z
  .object({
    email: z.string().email("E-mail inválido").max(255),
    senha: z
      .string()
      .min(6, "A senha deve ter no mínimo 6 caracteres")
      .max(128, "A senha deve ter no máximo 128 caracteres"),
  })
  .strict();

const bodyAlterarSenha = z
  .object({
    senha_atual: z.string().min(1, "A senha atual é obrigatória").max(128),
    nova_senha: z
      .string()
      .min(6, "A nova senha deve ter no mínimo 6 caracteres")
      .max(128, "A nova senha deve ter no máximo 128 caracteres"),
    confirmar_senha: z
      .string()
      .min(1, "A confirmação de senha é obrigatória")
      .max(128),
  })
  .strict()
  .refine((data) => data.nova_senha === data.confirmar_senha, {
    path: ["confirmar_senha"],
    message: "A confirmação de senha não coincide com a nova senha",
  });

const bodyStatus = z
  .object({
    status: z.enum(["disponivel", "ocupado", "nao_perturbe", "invisivel"], {
      message: "Status inválido",
    }),
  })
  .strict();

const queryLista = z
  .object({
    field: z
      .enum([
        "nome_completo",
        "nome_artistico",
        "email",
        "cidade",
        "estado",
        "status",
      ])
      .optional(),
    value: z.string().trim().optional(),
  })
  .strict();

const bodyConfiguracoes = z
  .object({
    mostrar_email: z.coerce.number().int().min(0).max(1).optional(),
    mostrar_telefone: z.coerce.number().int().min(0).max(1).optional(),
    mostrar_redes_sociais: z.coerce.number().int().min(0).max(1).optional(),
    perfil_publico: z.coerce.number().int().min(0).max(1).optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Informe ao menos uma configuração para atualizar",
  );

const bodyEsqueciSenha = z
  .object({
    email: z.string().email("E-mail inválido").max(255),
  })
  .strict();

const bodyRedefinirSenha = z
  .object({
    email: z.string().email("E-mail inválido").max(255),
    codigo: z.string().regex(/^\d{6}$/, "O código deve ter 6 dígitos"),
    nova_senha: z
      .string()
      .min(6, "A nova senha deve ter no mínimo 6 caracteres")
      .max(128, "A nova senha deve ter no máximo 128 caracteres"),
    confirmar_senha: z
      .string()
      .min(1, "A confirmação de senha é obrigatória")
      .max(128),
  })
  .strict()
  .refine((data) => data.nova_senha === data.confirmar_senha, {
    path: ["confirmar_senha"],
    message: "A confirmação de senha não coincide com a nova senha",
  });

const params = z
  .object({
    id: z.coerce.number().int().positive("O id deve ser um número positivo"),
  })
  .strict();

export const cadastroSchema = z.object({ body: bodyCadastro });
export const loginSchema = z.object({ body: bodyLogin });
export const esqueciSenhaSchema = z.object({ body: bodyEsqueciSenha });
export const redefinirSenhaSchema = z.object({ body: bodyRedefinirSenha });
export const atualizarSchema = z.object({
  params,
  body: bodyCadastro.omit({ senha: true }).partial(),
});
export const removerSchema = z.object({ params });
export const statusSchema = z.object({ params, body: bodyStatus });
export const alterarSenhaSchema = z.object({ params, body: bodyAlterarSenha });
export const listarSchema = z.object({ query: queryLista });
export const buscarSchema = z.object({ params });
export const configuracoesSchema = z.object({ params });
export const atualizarConfiguracoesSchema = z.object({
  params,
  body: bodyConfiguracoes,
});
export const semEntradaSchema = z.object({
  body: z.object({}).strict().optional().default({}),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});
