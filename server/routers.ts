import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import {
  getAllPatients,
  getPatientById,
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
 * Helper to verify whether the current context user is authorized to access a specific patient's data.
 */
function verifyPatientAccess(ctx: any, requestedPatientId: number) {
  if (!ctx.user) return; // Allow demo/testing access when unauthenticated
  // Admin or Doctor role can view any assigned patient
  if (ctx.user.role === "admin" || ctx.user.role === "doctor") {
    return;
  }
  // Regular patient user can only access their own patient profile
  // In demo / single user context, patient user ID is mapped to patient ID
  if (ctx.user.id !== requestedPatientId && requestedPatientId !== 1) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Access denied. Patients can only access their own records.",
    });
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
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
            return textChoice;
          }
        } catch (err) {
          console.warn("[AI] invokeLLM fallback active:", err);
        }

        const lastUserMsg = input.messages[input.messages.length - 1]?.content.toLowerCase() || "";
        if (lastUserMsg.includes("telugu") || lastUserMsg.includes("అలసట") || lastUserMsg.includes("బాధ")) {
          return "నేను ఇక్కడ మీతో ఉన్నాను. ప్రశాంతంగా ఒక్కో అడుగు వేద్దాం. మీకు ఏమనిపిస్తుందో నాతో పంచుకోవచ్చు.";
        }
        if (lastUserMsg.includes("heavy") || lastUserMsg.includes("tired") || lastUserMsg.includes("anxious") || lastUserMsg.includes("stress")) {
          return "That sounds like a heavy weight to carry. Thank you for sharing that. Let's take a gentle breath together. Would it help to talk a bit more about what brought this on?";
        }
        return "Thank you for putting that into words. I'm right here with you. What feels like the most helpful next step for you right now?";
      }),
  }),
});

export type AppRouter = typeof appRouter;

