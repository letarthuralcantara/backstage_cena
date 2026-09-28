import { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";
import { HttpError } from "../errors/HttpError.js";

/**
 * Recebe um schema Zod e devolve um middleware Express. O schema valida
 * body, query e params de uma vez só — por isso cada schema declara as
 * chaves que a rota realmente usa.
 */
export function validate(
  schema: ZodType,
  options?: { onInvalid?: (req: Request) => void | Promise<void> },
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
      file: req.file,
    });

    if (!result.success) {
      const issues: unknown[] = [];
      for (const issue of result.error.issues) {
        const issuePath =
          issue.path[0] === "file"
            ? ["body", "audio", ...issue.path.slice(1)]
            : issue.path;
        if (issue.code === "unrecognized_keys") {
          for (const key of issue.keys) {
            issues.push({
              ...issue,
              path: [...issuePath, key],
              message: `Campo não permitido: ${key}`,
            });
          }
        } else {
          issues.push(issuePath === issue.path ? issue : { ...issue, path: issuePath });
        }
      }
      const error = new HttpError(
        400,
        "Erro de validação",
        issues,
      );
      if (!options?.onInvalid) {
        next(error);
        return;
      }
      Promise.resolve(options.onInvalid(req))
        .catch((cleanupError) => console.error(cleanupError))
        .finally(() => next(error));
      return;
    }

    const data = result.data as {
      body?: unknown;
      query?: unknown;
      params?: unknown;
    };
    req.body = data.body ?? {};
    req.query = (data.query ?? {}) as Request["query"];
    req.params = (data.params ?? {}) as Request["params"];
    next();
  };
}
