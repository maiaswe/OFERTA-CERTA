import { z } from "zod";

export const loginInput = z
  .object({
    username: z
      .string()
      .trim()
      .normalize("NFC")
      .min(3, "Informe um nome de usuário com pelo menos 3 caracteres.")
      .max(60, "O nome de usuário pode ter até 60 caracteres.")
      .regex(
        /^[\p{L}\p{M}\p{N} _.@-]+$/u,
        "Use letras, números, espaços, ponto, @, hífen ou sublinhado.",
      ),
    password: z
      .string()
      .min(
        12,
        "A senha precisa ter pelo menos 12 caracteres. Você pode usar uma frase.",
      )
      .max(128, "A senha pode ter até 128 caracteres."),
    bootstrapToken: z.string().max(128).optional(),
  })
  .strict();
