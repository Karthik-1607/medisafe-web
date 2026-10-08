import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import fs from "fs";
import path from "path";
import {
  InsertUser,
  users,
  patientProfiles,
  prescriptions,
  prescriptionItems,
  patientRecords,
  assessments,
  clinicalNotes,
  appointments,
  type PatientProfile,
  type Prescription,
  type PrescriptionItem,
  type PatientRecord,
  type Assessment,
  type ClinicalNote,
  type Appointment,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Persistent JSON file store fallback for local environment without active MySQL database
const LOCAL_DB_PATH = path.join(process.cwd(), "uploads", "db_store.json");

interface LocalStoreData {
  patients: PatientProfile[];
  prescriptions: Prescription[];
  prescriptionItems: PrescriptionItem[];
  patientRecords: PatientRecord[];
  assessments: Assessment[];
  clinicalNotes: ClinicalNote[];
  appointments: Appointment[];
}

const DEFAULT_SEED_PATIENTS: PatientProfile[] = [
  {
    id: 1,
    userId: 101,
    name: "Aarav Rao",
    initials: "AR",
    age: 24,
    dateOfBirth: "2002-04-12",
    gender: "Male",
    contact: "+91 98765 43210",
    condition: "Depression support",
    mood: "Improving",
    moodTone: "mint",
    lastSeen: "12 min ago",
    status: "Review today",
    doctorId: 1,
    createdAt: new Date("2026-09-01"),
    updatedAt: new Date("2026-09-28"),
  },
  {
    id: 2,
    userId: 102,
    name: "Sana Patel",
    initials: "SP",
    age: 28,
    dateOfBirth: "1998-08-25",
    gender: "Female",
    contact: "+91 98765 43211",
    condition: "Recovery pathway",
    mood: "Steady",
    moodTone: "sand",
    lastSeen: "Yesterday",
    status: "On track",
    doctorId: 1,
    createdAt: new Date("2026-09-01"),
    updatedAt: new Date("2026-09-28"),
  },
  {
    id: 3,
    userId: 103,
    name: "Vikram Kulkarni",
    initials: "VK",
    age: 31,
    dateOfBirth: "1995-11-03",
    gender: "Male",
    contact: "+91 98765 43212",
    condition: "Anxiety support",
    mood: "Needs care",
    moodTone: "rose",
    lastSeen: "2 days ago",
    status: "Follow up",
    doctorId: 1,
    createdAt: new Date("2026-09-01"),
    updatedAt: new Date("2026-09-28"),
  },
  {
    id: 4,
    userId: 104,
    name: "Nisha Menon",
    initials: "NM",
    age: 22,
    dateOfBirth: "2004-01-19",
    gender: "Female",
    contact: "+91 98765 43213",
    condition: "Academic pressure",
    mood: "Improving",
    moodTone: "blue",
    lastSeen: "Sep 23",
    status: "On track",
    doctorId: 1,
    createdAt: new Date("2026-09-01"),
    updatedAt: new Date("2026-09-28"),
  },
  {
    id: 5,
    userId: 105,
    name: "Ananya Nair",
    initials: "AN",
    age: 25,
    dateOfBirth: "2001-06-15",
    gender: "Female",
    contact: "+91 98765 43214",
    condition: "General mental health support",
    mood: "Lighter",
    moodTone: "mint",
    lastSeen: "Today",
    status: "On track",
    doctorId: 1,
    createdAt: new Date("2026-09-01"),
    updatedAt: new Date("2026-09-28"),
  },
];

const DEFAULT_SEED_PRESCRIPTIONS: Prescription[] = [
  {
    id: 1,
    patientId: 1,
    doctorId: 1,
    doctorName: "Dr. Meera Mehta",
    prescriptionDate: new Date("2026-09-15T10:30:00Z"),
    doctorNotes: "Patient reported mild anxiety spikes in morning. Continue current dose and monitor PHQ-9. Follow up in two weeks.",
    createdAt: new Date("2026-09-15T10:30:00Z"),
  },
];

const DEFAULT_SEED_ITEMS: PrescriptionItem[] = [
  {
    id: 1,
    prescriptionId: 1,
    drugName: "Sertraline",
    dosage: "50 mg · once daily",
    duration: "30 days",
    foodRestrictions: "Take after breakfast with a full glass of water. Avoid alcohol.",
    createdAt: new Date("2026-09-15T10:30:00Z"),
  },
];

function readLocalStore(): LocalStoreData {
  try {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const content = fs.readFileSync(LOCAL_DB_PATH, "utf-8");
      const parsed = JSON.parse(content);
      return {
        patients: (parsed.patients || []).map((p: any) => ({ ...p, createdAt: new Date(p.createdAt), updatedAt: new Date(p.updatedAt) })),
        prescriptions: (parsed.prescriptions || []).map((p: any) => ({ ...p, prescriptionDate: new Date(p.prescriptionDate), createdAt: new Date(p.createdAt) })),
        prescriptionItems: (parsed.prescriptionItems || []).map((p: any) => ({ ...p, createdAt: new Date(p.createdAt) })),
        patientRecords: (parsed.patientRecords || []).map((r: any) => ({ ...r, uploadDate: new Date(r.uploadDate) })),
        assessments: (parsed.assessments || []).map((a: any) => ({ ...a, completedAt: new Date(a.completedAt) })),
        clinicalNotes: (parsed.clinicalNotes || []).map((c: any) => ({ ...c, createdAt: new Date(c.createdAt) })),
        appointments: (parsed.appointments || []).map((ap: any) => ({ ...ap, createdAt: new Date(ap.createdAt) })),
      };
    }
  } catch (err) {
    console.error("[LocalStore] Error reading local store file:", err);
  }
  const defaultData: LocalStoreData = {
    patients: DEFAULT_SEED_PATIENTS,
    prescriptions: DEFAULT_SEED_PRESCRIPTIONS,
    prescriptionItems: DEFAULT_SEED_ITEMS,
    patientRecords: [],
    assessments: [],
    clinicalNotes: [],
    appointments: [],
  };
  writeLocalStore(defaultData);
  return defaultData;
}

function writeLocalStore(data: LocalStoreData): void {
  try {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[LocalStore] Error writing local store file:", err);
  }
}

// Queries for feature operations
export async function getAllPatients(): Promise<PatientProfile[]> {
  const db = await getDb();
  if (db) {
    try {
      const results = await db.select().from(patientProfiles);
      if (results.length > 0) return results;
      // If DB empty, insert seed data
      for (const p of DEFAULT_SEED_PATIENTS) {
        await db.insert(patientProfiles).values(p);
      }
      return await db.select().from(patientProfiles);
    } catch (err) {
      console.warn("[Database] MySQL query failed, falling back to local store:", err);
    }
  }
  const store = readLocalStore();
  return store.patients;
}

export async function getPatientById(id: number): Promise<PatientProfile | undefined> {
  const db = await getDb();
  if (db) {
    try {
      const res = await db.select().from(patientProfiles).where(eq(patientProfiles.id, id)).limit(1);
      if (res.length > 0) return res[0];
    } catch (err) {
      console.warn("[Database] getPatientById query failed:", err);
    }
  }
  const store = readLocalStore();
  return store.patients.find((p) => p.id === id);
}

export async function createPrescription(data: {
  patientId: number;
  doctorId: number;
  doctorName: string;
  doctorNotes?: string;
  medicines: Array<{ drugName: string; dosage: string; duration: string; foodRestrictions?: string }>;
}): Promise<{ prescription: Prescription; items: PrescriptionItem[] }> {
  const db = await getDb();
  if (db) {
    try {
      const [insertRes] = await db.insert(prescriptions).values({
        patientId: data.patientId,
        doctorId: data.doctorId,
        doctorName: data.doctorName,
        doctorNotes: data.doctorNotes || null,
        prescriptionDate: new Date(),
      }) as any;
      const prescriptionId = insertRes.insertId;

      const itemsToInsert = data.medicines.map((m) => ({
        prescriptionId,
        drugName: m.drugName,
        dosage: m.dosage,
        duration: m.duration,
        foodRestrictions: m.foodRestrictions || null,
        createdAt: new Date(),
      }));

      for (const item of itemsToInsert) {
        await db.insert(prescriptionItems).values(item);
      }

      const [p] = await db.select().from(prescriptions).where(eq(prescriptions.id, prescriptionId));
      const items = await db.select().from(prescriptionItems).where(eq(prescriptionItems.prescriptionId, prescriptionId));
      return { prescription: p, items };
    } catch (err) {
      console.warn("[Database] MySQL createPrescription failed, falling back to local store:", err);
    }
  }

  const store = readLocalStore();
  const newPrescriptionId = store.prescriptions.length > 0 ? Math.max(...store.prescriptions.map((p) => p.id)) + 1 : 1;
  const newPrescription: Prescription = {
    id: newPrescriptionId,
    patientId: data.patientId,
    doctorId: data.doctorId,
    doctorName: data.doctorName,
    doctorNotes: data.doctorNotes || null,
    prescriptionDate: new Date(),
    createdAt: new Date(),
  };

  const newItems: PrescriptionItem[] = data.medicines.map((m, idx) => ({
    id: (store.prescriptionItems.length > 0 ? Math.max(...store.prescriptionItems.map((i) => i.id)) : 0) + idx + 1,
    prescriptionId: newPrescriptionId,
    drugName: m.drugName,
    dosage: m.dosage,
    duration: m.duration,
    foodRestrictions: m.foodRestrictions || null,
    createdAt: new Date(),
  }));

  store.prescriptions.push(newPrescription);
  store.prescriptionItems.push(...newItems);
  writeLocalStore(store);

  return { prescription: newPrescription, items: newItems };
}

export async function getPrescriptionsForPatient(patientId: number): Promise<Array<Prescription & { medicines: PrescriptionItem[] }>> {
  const db = await getDb();
  if (db) {
    try {
      const plist = await db.select().from(prescriptions).where(eq(prescriptions.patientId, patientId));
      const result = [];
      for (const p of plist) {
        const items = await db.select().from(prescriptionItems).where(eq(prescriptionItems.prescriptionId, p.id));
        result.push({ ...p, medicines: items });
      }
      return result.sort((a, b) => new Date(b.prescriptionDate).getTime() - new Date(a.prescriptionDate).getTime());
    } catch (err) {
      console.warn("[Database] MySQL getPrescriptionsForPatient failed:", err);
    }
  }

  const store = readLocalStore();
  const plist = store.prescriptions.filter((p) => p.patientId === patientId);
  const result = plist.map((p) => ({
    ...p,
    medicines: store.prescriptionItems.filter((i) => i.prescriptionId === p.id),
  }));
  return result.sort((a, b) => new Date(b.prescriptionDate).getTime() - new Date(a.prescriptionDate).getTime());
}

export async function createPatientRecord(data: {
  patientId: number;
  fileName: string;
  fileType: string;
  fileSize?: number;
  fileUrl: string;
  title?: string;
  description?: string;
}): Promise<PatientRecord> {
  const db = await getDb();
  if (db) {
    try {
      const [insertRes] = await db.insert(patientRecords).values({
        patientId: data.patientId,
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize || null,
        fileUrl: data.fileUrl,
        title: data.title || null,
        description: data.description || null,
        uploadDate: new Date(),
      }) as any;
      const recordId = insertRes.insertId;
      const [rec] = await db.select().from(patientRecords).where(eq(patientRecords.id, recordId));
      return rec;
    } catch (err) {
      console.warn("[Database] MySQL createPatientRecord failed, falling back to local store:", err);
    }
  }

  const store = readLocalStore();
  const newRecordId = store.patientRecords.length > 0 ? Math.max(...store.patientRecords.map((r) => r.id)) + 1 : 1;
  const newRecord: PatientRecord = {
    id: newRecordId,
    patientId: data.patientId,
    fileName: data.fileName,
    fileType: data.fileType,
    fileSize: data.fileSize || null,
    fileUrl: data.fileUrl,
    title: data.title || null,
    description: data.description || null,
    uploadDate: new Date(),
  };

  store.patientRecords.push(newRecord);
  writeLocalStore(store);
  return newRecord;
}

export async function getPatientRecords(patientId: number): Promise<PatientRecord[]> {
  const db = await getDb();
  if (db) {
    try {
      const recs = await db.select().from(patientRecords).where(eq(patientRecords.patientId, patientId));
      return recs.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
    } catch (err) {
      console.warn("[Database] MySQL getPatientRecords failed:", err);
    }
  }

  const store = readLocalStore();
  const recs = store.patientRecords.filter((r) => r.patientId === patientId);
  return recs.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
}

export async function getPatientRecordById(recordId: number): Promise<PatientRecord | undefined> {
  const db = await getDb();
  if (db) {
    try {
      const res = await db.select().from(patientRecords).where(eq(patientRecords.id, recordId)).limit(1);
      if (res.length > 0) return res[0];
    } catch (err) {
      console.warn("[Database] getPatientRecordById failed:", err);
    }
  }

  const store = readLocalStore();
  return store.patientRecords.find((r) => r.id === recordId);
}

export async function createAssessment(data: {
  patientId: number;
  title: string;
  type: string;
  score: number;
  maxScore: number;
  severity?: string;
  answersJson?: string;
}): Promise<Assessment> {
  const db = await getDb();
  if (db) {
    try {
      const [insertRes] = await db.insert(assessments).values({
        patientId: data.patientId,
        title: data.title,
        type: data.type,
        score: data.score,
        maxScore: data.maxScore,
        severity: data.severity || null,
        answersJson: data.answersJson || null,
        completedAt: new Date(),
      }) as any;
      const [res] = await db.select().from(assessments).where(eq(assessments.id, insertRes.insertId));
      return res;
    } catch (err) {
      console.warn("[Database] MySQL createAssessment failed:", err);
    }
  }
  const store = readLocalStore();
  const id = store.assessments.length > 0 ? Math.max(...store.assessments.map((a) => a.id)) + 1 : 1;
  const newAssessment: Assessment = {
    id,
    patientId: data.patientId,
    title: data.title,
    type: data.type,
    score: data.score,
    maxScore: data.maxScore,
    severity: data.severity || null,
    answersJson: data.answersJson || null,
    completedAt: new Date(),
  };
  store.assessments.push(newAssessment);
  writeLocalStore(store);
  return newAssessment;
}

export async function getAssessmentsForPatient(patientId: number): Promise<Assessment[]> {
  const db = await getDb();
  if (db) {
    try {
      const res = await db.select().from(assessments).where(eq(assessments.patientId, patientId));
      return res.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    } catch (err) {
      console.warn("[Database] MySQL getAssessmentsForPatient failed:", err);
    }
  }
  const store = readLocalStore();
  return store.assessments.filter((a) => a.patientId === patientId).sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
}

export async function createClinicalNote(data: {
  patientId: number;
  doctorId: number;
  doctorName: string;
  note: string;
}): Promise<ClinicalNote> {
  const db = await getDb();
  if (db) {
    try {
      const [insertRes] = await db.insert(clinicalNotes).values({
        patientId: data.patientId,
        doctorId: data.doctorId,
        doctorName: data.doctorName,
        note: data.note,
        createdAt: new Date(),
      }) as any;
      const [res] = await db.select().from(clinicalNotes).where(eq(clinicalNotes.id, insertRes.insertId));
      return res;
    } catch (err) {
      console.warn("[Database] MySQL createClinicalNote failed:", err);
    }
  }
  const store = readLocalStore();
  const id = store.clinicalNotes.length > 0 ? Math.max(...store.clinicalNotes.map((c) => c.id)) + 1 : 1;
  const newNote: ClinicalNote = {
    id,
    patientId: data.patientId,
    doctorId: data.doctorId,
    doctorName: data.doctorName,
    note: data.note,
    createdAt: new Date(),
  };
  store.clinicalNotes.push(newNote);
  writeLocalStore(store);
  return newNote;
}

export async function getNotesForPatient(patientId: number): Promise<ClinicalNote[]> {
  const db = await getDb();
  if (db) {
    try {
      const res = await db.select().from(clinicalNotes).where(eq(clinicalNotes.patientId, patientId));
      return res.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.warn("[Database] MySQL getNotesForPatient failed:", err);
    }
  }
  const store = readLocalStore();
  return store.clinicalNotes.filter((c) => c.patientId === patientId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createAppointment(data: {
  patientId: number;
  doctorId: number;
  doctorName: string;
  date: string;
  time: string;
  reason?: string;
}): Promise<Appointment> {
  const db = await getDb();
  if (db) {
    try {
      const [insertRes] = await db.insert(appointments).values({
        patientId: data.patientId,
        doctorId: data.doctorId,
        doctorName: data.doctorName,
        date: data.date,
        time: data.time,
        reason: data.reason || null,
        status: "Scheduled",
        createdAt: new Date(),
      }) as any;
      const [res] = await db.select().from(appointments).where(eq(appointments.id, insertRes.insertId));
      return res;
    } catch (err) {
      console.warn("[Database] MySQL createAppointment failed:", err);
    }
  }
  const store = readLocalStore();
  const id = store.appointments.length > 0 ? Math.max(...store.appointments.map((a) => a.id)) + 1 : 1;
  const newApp: Appointment = {
    id,
    patientId: data.patientId,
    doctorId: data.doctorId,
    doctorName: data.doctorName,
    date: data.date,
    time: data.time,
    reason: data.reason || null,
    status: "Scheduled",
    createdAt: new Date(),
  };
  store.appointments.push(newApp);
  writeLocalStore(store);
  return newApp;
}

export async function getAppointmentsForPatient(patientId: number): Promise<Appointment[]> {
  const db = await getDb();
  if (db) {
    try {
      const res = await db.select().from(appointments).where(eq(appointments.patientId, patientId));
      return res.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.warn("[Database] MySQL getAppointmentsForPatient failed:", err);
    }
  }
  const store = readLocalStore();
  return store.appointments.filter((a) => a.patientId === patientId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

