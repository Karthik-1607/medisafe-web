import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Patient profile information
 */
export const patientProfiles = mysqlTable("patient_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  initials: varchar("initials", { length: 10 }).notNull(),
  age: int("age").notNull(),
  dateOfBirth: varchar("dateOfBirth", { length: 50 }),
  gender: varchar("gender", { length: 50 }),
  contact: varchar("contact", { length: 100 }),
  condition: text("condition"),
  mood: varchar("mood", { length: 50 }),
  moodTone: varchar("moodTone", { length: 20 }).default("mint"),
  lastSeen: varchar("lastSeen", { length: 50 }),
  status: varchar("status", { length: 50 }),
  doctorId: int("doctorId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PatientProfile = typeof patientProfiles.$inferSelect;
export type InsertPatientProfile = typeof patientProfiles.$inferInsert;

/**
 * Prescriptions created by doctors for patients
 */
export const prescriptions = mysqlTable("prescriptions", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull().references(() => patientProfiles.id),
  doctorId: int("doctorId").notNull(),
  doctorName: varchar("doctorName", { length: 255 }).notNull(),
  prescriptionDate: timestamp("prescriptionDate").defaultNow().notNull(),
  doctorNotes: text("doctorNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = typeof prescriptions.$inferInsert;

/**
 * Individual medicines in a prescription
 */
export const prescriptionItems = mysqlTable("prescription_items", {
  id: int("id").autoincrement().primaryKey(),
  prescriptionId: int("prescriptionId").notNull().references(() => prescriptions.id),
  drugName: varchar("drugName", { length: 255 }).notNull(),
  dosage: varchar("dosage", { length: 255 }).notNull(),
  duration: varchar("duration", { length: 255 }).notNull(),
  foodRestrictions: text("foodRestrictions"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PrescriptionItem = typeof prescriptionItems.$inferSelect;
export type InsertPrescriptionItem = typeof prescriptionItems.$inferInsert;

/**
 * Patient uploaded medical/mental health records
 */
export const patientRecords = mysqlTable("patient_records", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull().references(() => patientProfiles.id),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 50 }).notNull(),
  fileSize: int("fileSize"),
  fileUrl: text("fileUrl").notNull(),
  title: text("title"),
  description: text("description"),
  uploadDate: timestamp("uploadDate").defaultNow().notNull(),
});

export type PatientRecord = typeof patientRecords.$inferSelect;
export type InsertPatientRecord = typeof patientRecords.$inferInsert;

/**
 * Patient assessment check-in results (PHQ-9, GAD-7, DAST-10)
 */
export const assessments = mysqlTable("assessments", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull().references(() => patientProfiles.id),
  title: varchar("title", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  score: int("score").notNull(),
  maxScore: int("maxScore").notNull(),
  severity: varchar("severity", { length: 100 }),
  answersJson: text("answersJson"),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = typeof assessments.$inferInsert;

/**
 * Clinical notes written by doctors for patients
 */
export const clinicalNotes = mysqlTable("clinical_notes", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull().references(() => patientProfiles.id),
  doctorId: int("doctorId").notNull(),
  doctorName: varchar("doctorName", { length: 255 }).notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ClinicalNote = typeof clinicalNotes.$inferSelect;
export type InsertClinicalNote = typeof clinicalNotes.$inferInsert;

/**
 * Appointments scheduled between patients and doctors
 */
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull().references(() => patientProfiles.id),
  doctorId: int("doctorId").notNull(),
  doctorName: varchar("doctorName", { length: 255 }).notNull(),
  date: varchar("date", { length: 50 }).notNull(),
  time: varchar("time", { length: 50 }).notNull(),
  reason: text("reason"),
  status: varchar("status", { length: 50 }).default("Scheduled").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;