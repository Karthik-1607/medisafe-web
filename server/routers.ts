import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import type { SessionUser, TrpcContext } from "./_core/context";
import {
  AccountError,
  createAccount,
  createSessionToken,
  demoSessionClaims,
  findAccountByEmail,
  sessionUserFromClaims,
  verifyPassword,
  SESSION_MAX_AGE_SECONDS,
  type PortalRole,
  type SessionClaims,
} from "./_core/localAuth";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import {
  getAllPatients,
  getPatientById,
  getAllAssessments,
  getAllPrescriptionsWithItems,
  createPrescription,
  getPrescriptionsForPatient,
  createPatientRecord,
  getPatientRecords,
  createAssessment,
  getAssessmentsForPatient,
  createClinicalNote,
  getNotesForPatient,
  createAppointment,
  getAppointmentsForPatient,
} from "./db";
import { storagePut } from "./storage";

/**
 * Every patient-data route needs a signed-in session (password login, demo
 * session, or OAuth). The prototype previously returned early here for
 * anonymous callers, which meant anyone could read and write patient records
 * without an account.
 */
function requireSession(ctx: TrpcContext): SessionUser {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Please sign in to access patient data.",
    });
  }
  return ctx.user;
}

function portalRoleOf(user: SessionUser): PortalRole {
  if (user.portalRole) return user.portalRole;
  // OAuth users only carry the schema-level role; admins get the clinician view.
  return user.role === "admin" ? "doctor" : "patient";
}

/**
 * Helper to verify whether the current context user is authorized to access a specific patient's data.
 */
function verifyPatientAccess(ctx: TrpcContext, requestedPatientId: number) {
  const user = requireSession(ctx);

  // Admin or clinician accounts may open any assigned patient.
  if (portalRoleOf(user) === "doctor" || user.role === "admin") {
    return;
  }

  // Patient accounts may only read their own linked profile.
  const ownPatientId = user.patientId ?? 1;
  if (requestedPatientId !== ownPatientId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Access denied. Patients can only access their own records.",
    });
  }
}

/** Clinician-only views: the patient list and every-patient queries. */
function requireClinician(ctx: TrpcContext): SessionUser {
  const user = requireSession(ctx);
  if (portalRoleOf(user) !== "doctor" && user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only clinicians can access this view.",
    });
  }
  return user;
}

/** Bind a freshly issued session token to the caller's browser. */
function setSessionCookie(ctx: TrpcContext, token: string): void {
  ctx.res.cookie(COOKIE_NAME, token, {
    ...getSessionCookieOptions(ctx.req),
    // Express expects milliseconds here, while the JWT expiry is in seconds.
    maxAge: SESSION_MAX_AGE_SECONDS * 1000,
  });
}

async function startSession(ctx: TrpcContext, claims: SessionClaims): Promise<SessionUser> {
  setSessionCookie(ctx, await createSessionToken(claims));
  return sessionUserFromClaims(claims);
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

    register: publicProcedure
      .input(
        z.object({
          name: z.string().trim().min(2, "Please enter your name"),
          email: z.string().trim().email("Enter a valid email address"),
          password: z.string().min(8, "Password must be at least 8 characters"),
          role: z.enum(["patient", "doctor"]).default("patient"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const account = await createAccount({
            name: input.name,
            email: input.email,
            password: input.password,
            portalRole: input.role,
          });
          return await startSession(ctx, {
            accountId: account.id,
            email: account.email,
            name: account.name,
            portalRole: account.portalRole,
            patientId: account.patientId,
            demo: false,
          });
        } catch (err) {
          if (err instanceof AccountError) {
            throw new TRPCError({ code: "CONFLICT", message: err.message });
          }
          throw err;
        }
      }),

    login: publicProcedure
      .input(
        z.object({
          email: z.string().trim().email("Enter a valid email address"),
          password: z.string().min(1, "Enter your password"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const account = findAccountByEmail(input.email);
        const passwordOk = account
          ? await verifyPassword(input.password, account.passwordHash)
          : false;

        if (!account || !passwordOk) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email or password is incorrect.",
          });
        }

        return await startSession(ctx, {
          accountId: account.id,
          email: account.email,
          name: account.name,
          portalRole: account.portalRole,
          patientId: account.patientId,
          demo: false,
        });
      }),

    /** One-click demo session so the portal can be explored without an account. */
    demo: publicProcedure.mutation(async ({ ctx }) => {
      return await startSession(ctx, demoSessionClaims());
    }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  patients: router({
    list: publicProcedure.query(async ({ ctx }) => {
      requireClinician(ctx);
      return await getAllPatients();
    }),
    getDetails: publicProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input, ctx }) => {
        verifyPatientAccess(ctx, input.patientId);

        const patient = await getPatientById(input.patientId);
        if (!patient) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Patient with ID ${input.patientId} not found`,
          });
        }
        const records = await getPatientRecords(input.patientId);
        const prescriptions = await getPrescriptionsForPatient(input.patientId);
        const assessmentsList = await getAssessmentsForPatient(input.patientId);
        const notesList = await getNotesForPatient(input.patientId);
        const appointmentsList = await getAppointmentsForPatient(input.patientId);
        return {
          patient,
          records,
          prescriptions,
          assessments: assessmentsList,
          notes: notesList,
          appointments: appointmentsList,
        };
      }),
  }),

  prescriptions: router({
    create: publicProcedure
      .input(
        z.object({
          patientId: z.number(),
          doctorId: z.number().default(1),
          doctorName: z.string().default("Dr. Meera Mehta"),
          doctorNotes: z.string().optional(),
          medicines: z
            .array(
              z.object({
                drugName: z.string().min(1, "Drug/Medicine name is required"),
                dosage: z.string().min(1, "Dosage is required"),
                duration: z.string().min(1, "Duration is required"),
                foodRestrictions: z.string().optional(),
              })
            )
            .min(1, "At least one medicine is required in a prescription"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        verifyPatientAccess(ctx, input.patientId);
        const patient = await getPatientById(input.patientId);
        if (!patient) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Patient not found",
          });
        }
        const result = await createPrescription({
          patientId: input.patientId,
          doctorId: input.doctorId,
          doctorName: input.doctorName,
          doctorNotes: input.doctorNotes,
          medicines: input.medicines,
        });
        return result;
      }),

    listForPatient: publicProcedure
      .input(z.object({ patientId: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const patientId = input?.patientId || 1;
        verifyPatientAccess(ctx, patientId);
        return await getPrescriptionsForPatient(patientId);
      }),

    /** Clinician view: every prescription with its medicines, newest first. */
    listAll: publicProcedure.query(async ({ ctx }) => {
      requireClinician(ctx);
      return await getAllPrescriptionsWithItems();
    }),
  }),

  records: router({
    upload: publicProcedure
      .input(
        z.object({
          patientId: z.number(),
          fileName: z.string().min(1, "File name is required"),
          fileType: z.string().refine(
            (val) => ["application/pdf", "image/png", "image/jpeg", "image/jpg"].includes(val.toLowerCase()),
            "Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed."
          ),
          fileSize: z.number().max(15 * 1024 * 1024, "File size must not exceed 15MB"),
          fileData: z.string().min(1, "File content is required"),
          title: z.string().optional(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        verifyPatientAccess(ctx, input.patientId);

        const patient = await getPatientById(input.patientId);
        if (!patient) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Patient not found",
          });
        }

        const safeFileName = input.fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
        const relKey = `patient_${input.patientId}/${Date.now()}_${safeFileName}`;

        const { url } = await storagePut(relKey, input.fileData, input.fileType);

        const record = await createPatientRecord({
          patientId: input.patientId,
          fileName: input.fileName,
          fileType: input.fileType,
          fileSize: input.fileSize,
          fileUrl: url,
          title: input.title || input.fileName,
          description: input.description,
        });

        return record;
      }),

    listForPatient: publicProcedure
      .input(z.object({ patientId: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const patientId = input?.patientId || 1;
        verifyPatientAccess(ctx, patientId);
        return await getPatientRecords(patientId);
      }),
  }),

  assessments: router({
    submit: publicProcedure
      .input(
        z.object({
          patientId: z.number().default(1),
          title: z.string(),
          type: z.string(),
          score: z.number(),
          maxScore: z.number(),
          severity: z.string().optional(),
          answersJson: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        verifyPatientAccess(ctx, input.patientId);
        return await createAssessment(input);
      }),

    listForPatient: publicProcedure
      .input(z.object({ patientId: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const patientId = input?.patientId || 1;
        verifyPatientAccess(ctx, patientId);
        return await getAssessmentsForPatient(patientId);
      }),

    /** Clinician view: every assessment across patients, newest first. */
    listAll: publicProcedure.query(async ({ ctx }) => {
      requireClinician(ctx);
      return await getAllAssessments();
    }),
  }),

  notes: router({
    create: publicProcedure
      .input(
        z.object({
          patientId: z.number(),
          doctorId: z.number().default(1),
          doctorName: z.string().default("Dr. Meera Mehta"),
          note: z.string().min(1, "Note content cannot be empty"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        verifyPatientAccess(ctx, input.patientId);
        return await createClinicalNote(input);
      }),

    listForPatient: publicProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input, ctx }) => {
        verifyPatientAccess(ctx, input.patientId);
        return await getNotesForPatient(input.patientId);
      }),
  }),

  appointments: router({
    create: publicProcedure
      .input(
        z.object({
          patientId: z.number().default(1),
          doctorId: z.number().default(1),
          doctorName: z.string().default("Dr. Meera Mehta"),
          date: z.string(),
          time: z.string(),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        verifyPatientAccess(ctx, input.patientId);
        return await createAppointment(input);
      }),

    listForPatient: publicProcedure
      .input(z.object({ patientId: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const patientId = input?.patientId || 1;
        verifyPatientAccess(ctx, patientId);
        return await getAppointmentsForPatient(patientId);
      }),
  }),

  ai: router({
    chat: publicProcedure
      .input(
        z.object({
          messages: z.array(
            z.object({
              role: z.enum(["system", "user", "assistant"]),
              content: z.string(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        // Honest degradation: when the model is unreachable the client is told
        // this is a fixed notice instead of receiving canned replies that read
        // as if a real companion had answered.
        const degradedResponse = {
          reply:
            "I can't reach the companion service right now, so this is a fixed fallback notice rather than a real response. Please try again in a moment. Until then: breathe in for 4 counts, out for 4 counts, and reach out to someone you trust — or local emergency support if you feel unsafe.",
          degraded: true,
        } as const;

        try {
          const result = await invokeLLM({
            messages: [
              {
                role: "system",
                content:
                  "You are MindSafe Companion, a empathetic, non-judgmental, language-aware supportive companion for mental health and recovery. Speak warmly in English, Telugu, or Tenglish according to how the user addresses you. Keep responses supportive, practical, and grounded. You do NOT diagnose or provide emergency medical advice.",
              },
              ...input.messages.map((m) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
              })),
            ],
          });
          const textChoice = result.choices?.[0]?.message?.content;
          if (typeof textChoice === "string" && textChoice.trim().length > 0) {
            return { reply: textChoice, degraded: false } as const;
          }
        } catch (err) {
          console.warn("[AI] invokeLLM unavailable, returning degraded response:", err);
        }

        return degradedResponse;
      }),
  }),
});

export type AppRouter = typeof appRouter;

