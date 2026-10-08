import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createCaller() {
  const ctx: TrpcContext = {
    user: undefined,
    req: { protocol: "https", headers: {} } as any,
    res: {} as any,
  };
  return appRouter.createCaller(ctx);
}

describe("Doctor -> Patient -> Prescription -> Records Workflow", () => {
  it("fetches the list of patients", async () => {
    const caller = createCaller();
    const patients = await caller.patients.list();
    expect(patients.length).toBeGreaterThan(0);
    expect(patients[0]).toHaveProperty("name");
  });

  it("gets details for a specific patient including records and prescriptions", async () => {
    const caller = createCaller();
    const details = await caller.patients.getDetails({ patientId: 1 });
    expect(details.patient.name).toBe("Aarav Rao");
    expect(Array.isArray(details.records)).toBe(true);
    expect(Array.isArray(details.prescriptions)).toBe(true);
  });

  it("creates a prescription with multiple medicines for a patient", async () => {
    const caller = createCaller();
    const result = await caller.prescriptions.create({
      patientId: 1,
      doctorId: 1,
      doctorName: "Dr. Meera Mehta",
      doctorNotes: "Take medications regularly.",
      medicines: [
        {
          drugName: "Sertraline",
          dosage: "50 mg",
          duration: "30 days",
          foodRestrictions: "Take with food",
        },
        {
          drugName: "Propranolol",
          dosage: "10 mg",
          duration: "14 days",
          foodRestrictions: "As needed for panic",
        },
      ],
    });

    expect(result.prescription.patientId).toBe(1);
    expect(result.items.length).toBe(2);
    expect(result.items[0].drugName).toBe("Sertraline");
    expect(result.items[1].drugName).toBe("Propranolol");
  });

  it("allows a patient to upload a previous record and retrieve it", async () => {
    const caller = createCaller();
    const uploadedRecord = await caller.records.upload({
      patientId: 1,
      fileName: "blood_report.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      fileData: "data:application/pdf;base64,JVBERi0xLjQK%",
      title: "Blood Test Report",
      description: "Annual health checkup PDF",
    });

    expect(uploadedRecord.fileName).toBe("blood_report.pdf");
    expect(uploadedRecord.fileType).toBe("application/pdf");

    const patientRecords = await caller.records.listForPatient({ patientId: 1 });
    const found = patientRecords.find((r) => r.id === uploadedRecord.id);
    expect(found).toBeDefined();
    expect(found?.title).toBe("Blood Test Report");
  });

  it("rejects invalid file types for record upload", async () => {
    const caller = createCaller();
    await expect(
      caller.records.upload({
        patientId: 1,
        fileName: "malicious.exe",
        fileType: "application/x-msdownload",
        fileSize: 1024,
        fileData: "data:application/x-msdownload;base64,dGVzdA==",
      })
    ).rejects.toThrow(/Invalid file type/);
  });
});
