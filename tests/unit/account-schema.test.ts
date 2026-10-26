import { describe, expect, it } from "vitest";

import {
  ACCOUNT_ERRORS,
  ACCOUNT_LIMITS,
  loginSchema,
  passwordChangeSchema,
  registerSchema,
} from "@/lib/account-schema";

const firstError = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? undefined : result.error?.issues[0]?.message;

describe("registerSchema", () => {
  it("приводит почту к нижнему регистру и обрезает пробелы", () => {
    const result = registerSchema.parse({
      email: "  Aigul@Example.KG ",
      password: "достаточно",
      name: "  Айгуль ",
    });
    expect(result.email).toBe("aigul@example.kg");
    expect(result.name).toBe("Айгуль");
  });

  it("кривая почта — emailInvalid", () => {
    expect(firstError(registerSchema.safeParse({ email: "aigul", password: "12345678" }))).toBe(
      ACCOUNT_ERRORS.emailInvalid,
    );
  });

  it("пароль короче восьми — passwordShort, восемь — можно", () => {
    const short = "x".repeat(ACCOUNT_LIMITS.PASSWORD_MIN - 1);
    expect(firstError(registerSchema.safeParse({ email: "a@b.kg", password: short }))).toBe(
      ACCOUNT_ERRORS.passwordShort,
    );
    const enough = "x".repeat(ACCOUNT_LIMITS.PASSWORD_MIN);
    expect(registerSchema.safeParse({ email: "a@b.kg", password: enough }).success).toBe(true);
  });

  it("слишком длинное имя — nameLong", () => {
    const result = registerSchema.safeParse({
      email: "a@b.kg",
      password: "12345678",
      name: "А".repeat(ACCOUNT_LIMITS.NAME_MAX + 1),
    });
    expect(firstError(result)).toBe(ACCOUNT_ERRORS.nameLong);
  });

  it("роль из формы не принимается: в результате её нет", () => {
    const result = registerSchema.parse({
      email: "a@b.kg",
      password: "12345678",
      role: "ADMIN",
    } as Record<string, string>);
    expect(result).not.toHaveProperty("role");
  });
});

describe("loginSchema", () => {
  it("пустой пароль — wrong, а не подсказка о длине", () => {
    expect(firstError(loginSchema.safeParse({ email: "a@b.kg", password: "" }))).toBe(
      ACCOUNT_ERRORS.wrong,
    );
  });

  it("короткий пароль при входе не проверяется на длину", () => {
    expect(loginSchema.safeParse({ email: "a@b.kg", password: "1" }).success).toBe(true);
  });
});

describe("passwordChangeSchema", () => {
  it("без текущего пароля — currentWrong", () => {
    expect(
      firstError(passwordChangeSchema.safeParse({ current: "", password: "новый-пароль" })),
    ).toBe(ACCOUNT_ERRORS.currentWrong);
  });

  it("новый короче восьми — passwordShort", () => {
    expect(firstError(passwordChangeSchema.safeParse({ current: "старый", password: "123" }))).toBe(
      ACCOUNT_ERRORS.passwordShort,
    );
  });

  it("порог сотрудника выше порога заявителя", () => {
    expect(ACCOUNT_LIMITS.STAFF_PASSWORD_MIN).toBeGreaterThan(ACCOUNT_LIMITS.PASSWORD_MIN);
  });
});
