export type PapelWorkOn = "dono" | "editor" | "ouvinte";
export type VisibilidadeWorkOn = "publico" | "link";

export interface PapelMembroWorkOn { id_usuario: number; papel: PapelWorkOn }

export function papelMembro(papel?: string | null): PapelWorkOn | null {
  if (papel === "dono" || papel === "editor" || papel === "ouvinte") return papel;
  return null;
}

export function podeLerMembro(papel: string | null | undefined): boolean {
  return papelMembro(papel) !== null;
}

export function podeEditarProjeto(papel: string | null | undefined): boolean {
  return papelMembro(papel) === "dono" || papelMembro(papel) === "editor";
}

export function podeGerenciarMembros(papel: string | null | undefined): boolean {
  return papelMembro(papel) === "dono";
}

export function podeMudarVisibilidade(papel: string | null | undefined): boolean {
  return papelMembro(papel) === "dono";
}

export function podeExcluirProjeto(papel: string | null | undefined): boolean {
  return papelMembro(papel) === "dono";
}
