import { promises as fs } from "node:fs";

export async function removerUploadTemporario(
  arquivo?: Express.Multer.File,
): Promise<void> {
  if (!arquivo) return;
  try {
    await fs.unlink(arquivo.path);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }
    throw error;
  }
}
