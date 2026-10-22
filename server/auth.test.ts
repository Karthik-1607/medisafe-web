import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { appRouter } from "./routers";
import type { TrpcContext, SessionUser } from "./_core/context";
import { authenticateLocalSession } from "./_core/localAuth";
import { COOKIE_NAME } from "../shared/const";

type CookieCall = { name: string; value: string; options: Record<string, unknown> };

function createContext(user: SessionUser | null = null) {
  const cookies: CookieCall[] = [];
  const cleared: string[] = [];
  const ctx = {
    user,
    req: { protocol: "https", headers: {} },
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        cookies.push({ name, value, options });
      },
      clearCookie: (name: string) => {
        cleared.push(name);
      },
    },
  } as unknown as TrpcContext;
  return { ctx, cookies, cleared };
}

const doctorUser: SessionUser = {
  id: 1,
  openId: "test-doctor",
  name: "Dr. Test",
  email: "doctor@medisafe.test",
  loginMethod: "password",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
  portalRole: "doctor",
  patientId: 1,
};

const patientUser: SessionUser = {
  ...doctorUser,
  id: 7,
  openId: "test-patient",
  name: "Test Patient",
  email: "patient@medisafe.test",
  portalRole: "patient",
  patientId: 1,
};

const ACCOUNTS_PATH = path.join(process.cwd(), "uploads", "accounts.json");
const testEmail = `login-flow-${Date.now()}@medisafe.test`;
const testPassword = "correct-horse-battery";

function removeTestAccount() {
  try {
    if (!fs.existsSync(ACCOUNTS_PATH)) return;
    const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_PATH, "utf-8")) as Array<{ email: string }>;
    const filtered = accounts.filter((account) => account.email !== testEmail);
    fs.writeFileSync(ACCOUNTS_PATH, JSON.stringify(filtered, null, 2), "utf-8");
  } catch {
    /* best-effort cleanup of the test account */
  }
}

describe("local password authentication", () => {
  beforeAll(removeTestAccount);
  afterAll(removeTestAccount);

  it("registers an account, issues a real session cookie, and resolves it back to the user", async () => {
    const { ctx, cookies } = createContext();
    const caller = appRouter.createCaller(ctx);

    const user = await caller.auth.register({
      name: "Login Flow",
      email: testEmail,
      password: testPassword,
      role: "patient",
    });

    expect(user.email).toBe(testEmail);
    expect(user.portalRole).toBe("patient");

    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.name).toBe(COOKIE_NAME);

    const resolved = await authenticateLocalSession({
      headers: { cookie: `${COOKIE_NAME}=${cookies[0]!.value}` },
    });
    expect(resolved?.email).toBe(testEmail);
    expect(resolved?.portalRole).toBe("patient");
  });

  it("rejects a wrong password and accepts the right one", async () => {
    const { ctx } = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.login({ email: testEmail, password: "not-the-password" }),
    ).rejects.toThrow(/incorrect/i);

    const user = await caller.auth.login({ email: testEmail, password: testPassword });
    expect(user.email).toBe(testEmail);
  });

  it("rejects a duplicate registration", async () => {
    const { ctx } = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.register({
        name: "Login Flow",
        email: testEmail,
        password: testPassword,
        role: "patient",
      }),
    ).rejects.toThrow(/already exists/i);
  });

  it("starts a demo session cookie without creating an account", async () => {
    const { ctx, cookies } = createContext();
    const caller = appRouter.createCaller(ctx);

    const user = await caller.auth.demo();
    expect(user.demo).toBe(true);
    expect(user.portalRole).toBe("patient");
    expect(cookies).toHaveLength(1);
  });

  it("clears the session cookie on logout", async () => {
    const { ctx, cleared } = createContext(patientUser);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.logout()).resolves.toEqual({ success: true });
    expect(cleared).toContain(COOKIE_NAME);
  });
});

describe("patient data authorization", () => {
  it("blocks anonymous access to patient data", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.patients.getDetails({ patientId: 1 })).rejects.toThrow(/sign in/i);
    await expect(caller.patients.list()).rejects.toThrow(/sign in/i);
    await expect(caller.assessments.listForPatient({ patientId: 1 })).rejects.toThrow(/sign in/i);
    await expect(
      caller.notes.create({ patientId: 1, note: "Anonymous attempt" }),
    ).rejects.toThrow(/sign in/i);
    await expect(
      caller.prescriptions.create({
        patientId: 1,
        medicines: [{ drugName: "X", dosage: "1", duration: "1 day" }],
      } as never),
    ).rejects.toThrow(/sign in/i);
  });

  it("lets a patient read only their own linked profile", async () => {
    const { ctx } = createContext(patientUser);
    const caller = appRouter.createCaller(ctx);

    const own = await caller.patients.getDetails({ patientId: 1 });
    expect(own.patient.id).toBe(1);

    await expect(caller.patients.getDetails({ patientId: 2 })).rejects.toThrow(/own records/i);
    await expect(caller.assessments.listForPatient({ patientId: 2 })).rejects.toThrow(/own records/i);
  });

  it("keeps clinician-only views closed to patients", async () => {
    const { ctx } = createContext(patientUser);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.patients.list()).rejects.toThrow(/clinicians/i);
    await expect(caller.assessments.listAll()).rejects.toThrow(/clinicians/i);
    await expect(caller.prescriptions.listAll()).rejects.toThrow(/clinicians/i);
  });

  it("lets a clinician read the whole patient panel", async () => {
    const { ctx } = createContext(doctorUser);
    const caller = appRouter.createCaller(ctx);

    const patients = await caller.patients.list();
    expect(patients.length).toBeGreaterThan(0);

    await expect(caller.assessments.listAll()).resolves.toBeInstanceOf(Array);
    await expect(caller.prescriptions.listAll()).resolves.toBeInstanceOf(Array);
  });

  it("records doctor actions under the signed-in clinician", async () => {
    const { ctx } = createContext(doctorUser);
    const caller = appRouter.createCaller(ctx);

    const note = await caller.notes.create({
      patientId: 1,
      doctorId: 1,
      doctorName: "Dr. Test",
      note: "Follow-up scheduled.",
    });
    expect(note.doctorName).toBe("Dr. Test");
  });
});
