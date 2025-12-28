import { db } from "./db";
import bcrypt from "bcrypt";
import { 
  users, hospitals, roles, userHospitals, userRoles,
  wasteTypes, locationCategories, locations, wasteCollections, wasteTypeCosts
} from "@shared/schema";
import { sql } from "drizzle-orm";

const SALT_ROUNDS = 10;

export async function seedDatabase() {
  console.log("Seeding database...");

  try {
    const existingRoles = await db.select().from(roles);
    if (existingRoles.length > 0) {
      console.log("Database already seeded, skipping...");
      return;
    }

    const [hqRole] = await db.insert(roles).values({
      name: "HQ",
      description: "Genel Merkez - Tüm hastaneleri görür"
    }).returning();

    const [managerRole] = await db.insert(roles).values({
      name: "HOSPITAL_MANAGER",
      description: "Hastane Yöneticisi - Kendi hastanesini görür"
    }).returning();

    const [collectorRole] = await db.insert(roles).values({
      name: "COLLECTOR",
      description: "Saha Personeli - Atık toplama işlemleri"
    }).returning();

    const [h1] = await db.insert(hospitals).values({
      code: "H1",
      name: "Hastane 1 (Anadolu)",
      colorHex: "#3b82f6",
      isActive: true
    }).returning();

    const [h2] = await db.insert(hospitals).values({
      code: "H2",
      name: "Hastane 2 (Avrupa)",
      colorHex: "#8b5cf6",
      isActive: true
    }).returning();

    const [h3] = await db.insert(hospitals).values({
      code: "H3",
      name: "Hastane 3 (Merkez)",
      colorHex: "#10b981",
      isActive: true
    }).returning();

    const hashedPassword = await bcrypt.hash("123456", SALT_ROUNDS);

    const [hqAdmin] = await db.insert(users).values({
      username: "hq.admin",
      password: hashedPassword,
      email: "hq@isgmed.com",
      firstName: "Genel Merkez",
      lastName: "Admin",
      isActive: true,
      sourceSystem: "local"
    }).returning();

    const [managerH1] = await db.insert(users).values({
      username: "manager.h1",
      password: hashedPassword,
      email: "manager.h1@isgmed.com",
      firstName: "Ali",
      lastName: "Yılmaz",
      isActive: true,
      sourceSystem: "local"
    }).returning();

    const [collectorH1] = await db.insert(users).values({
      username: "collector.h1",
      password: hashedPassword,
      email: "collector.h1@isgmed.com",
      firstName: "Ahmet",
      lastName: "Demir",
      isActive: true,
      sourceSystem: "local"
    }).returning();

    await db.insert(userRoles).values([
      { userId: hqAdmin.id, roleId: hqRole.id },
      { userId: hqAdmin.id, roleId: managerRole.id },
      { userId: hqAdmin.id, roleId: collectorRole.id },
      { userId: managerH1.id, roleId: managerRole.id },
      { userId: managerH1.id, roleId: collectorRole.id },
      { userId: collectorH1.id, roleId: collectorRole.id },
    ]);

    await db.insert(userHospitals).values([
      { userId: hqAdmin.id, hospitalId: h1.id, isDefault: true },
      { userId: hqAdmin.id, hospitalId: h2.id, isDefault: false },
      { userId: hqAdmin.id, hospitalId: h3.id, isDefault: false },
      { userId: managerH1.id, hospitalId: h1.id, isDefault: true },
      { userId: collectorH1.id, hospitalId: h1.id, isDefault: true },
    ]);

    const [medicalType] = await db.insert(wasteTypes).values({
      code: "medical",
      name: "Tıbbi Atık",
      colorHex: "#e11d48",
      costPerKg: "15.00",
      isActive: true
    }).returning();

    const [hazardousType] = await db.insert(wasteTypes).values({
      code: "hazardous",
      name: "Tehlikeli Atık",
      colorHex: "#f59e0b",
      costPerKg: "25.00",
      isActive: true
    }).returning();

    const [domesticType] = await db.insert(wasteTypes).values({
      code: "domestic",
      name: "Evsel Atık",
      colorHex: "#64748b",
      costPerKg: "2.00",
      isActive: true
    }).returning();

    const [recycleType] = await db.insert(wasteTypes).values({
      code: "recycle",
      name: "Geri Dönüşüm",
      colorHex: "#06b6d4",
      costPerKg: "-1.00",
      isActive: true
    }).returning();

    const categoryData = [
      { code: "icu", name: "Yoğun Bakım", unit: "Yatış Gün", referenceWasteFactor: "2.5" },
      { code: "service", name: "Hasta Servisi", unit: "Yatış Gün", referenceWasteFactor: "1.2" },
      { code: "or", name: "Ameliyathane", unit: "Ameliyat", referenceWasteFactor: "6.0" },
      { code: "polyclinic", name: "Poliklinik", unit: "Protokol", referenceWasteFactor: "0.3" },
      { code: "office", name: "İdari Ofis", unit: "Sabit", referenceWasteFactor: "0.1" },
      { code: "other", name: "Diğer / Tanımsız", unit: "Sabit", referenceWasteFactor: "1.0" }
    ];

    const insertedCategories = await db.insert(locationCategories).values(categoryData).returning();
    const catMap = Object.fromEntries(insertedCategories.map(c => [c.code, c.id]));

    const locationData = [
      { code: "AMELIYATHANE-ODA1", categoryCode: "or", customLabel: "Ana Bina 1. Kat" },
      { code: "AMELIYATHANE-ODA2", categoryCode: "or", customLabel: "Ana Bina 1. Kat" },
      { code: "ACIL-TRIYAJ", categoryCode: "polyclinic", customLabel: "Acil Girişi" },
      { code: "ACIL-MUDAHALE", categoryCode: "polyclinic", customLabel: "Kırmızı Alan" },
      { code: "LAB-BIYOKIMYA", categoryCode: "other", customLabel: "Zemin Kat Laboratuvar" },
      { code: "POLIKLINIK-KBB", categoryCode: "polyclinic", customLabel: "Poliklinik Blok B" },
      { code: "YOGUNBAKIM-YB1", categoryCode: "icu", customLabel: "Cerrahi Yoğun Bakım" },
      { code: "STERILIZASYON-1", categoryCode: "other", customLabel: "-2. Kat" },
      { code: "OFIS-IDARI", categoryCode: "office", customLabel: "Başhekimlik Katı" },
      { code: "SERVIS-DAHILIYE-1", categoryCode: "service", customLabel: "3. Kat Yataklı Servis" }
    ];

    for (const hospital of [h1, h2, h3]) {
      for (const loc of locationData) {
        await db.insert(locations).values({
          hospitalId: hospital.id,
          code: loc.code,
          categoryId: catMap[loc.categoryCode],
          customLabel: loc.customLabel,
          isActive: true
        });
      }
    }

    const allTypes = [medicalType, hazardousType, domesticType, recycleType];
    const allHospitals = [h1, h2, h3];
    
    for (let i = 0; i < 50; i++) {
      const hospital = allHospitals[Math.floor(Math.random() * allHospitals.length)];
      const wasteType = allTypes[Math.floor(Math.random() * allTypes.length)];
      const weight = (Math.random() * 20 + 1).toFixed(3);
      const hours = Math.floor(Math.random() * 24);
      const date = new Date();
      date.setHours(hours, Math.floor(Math.random() * 60));
      date.setDate(date.getDate() - Math.floor(Math.random() * 7));

      await db.insert(wasteCollections).values({
        hospitalId: hospital.id,
        wasteTypeId: wasteType.id,
        tagCode: `TAG-${Date.now().toString(36).toUpperCase()}${i}`,
        collectedByUserId: collectorH1.id,
        collectedAt: date,
        weighedAt: Math.random() > 0.3 ? date : null,
        status: Math.random() > 0.3 ? "completed" : "pending",
        weightKg: Math.random() > 0.3 ? weight : null,
        isManualWeight: true
      });
    }

    await db.insert(wasteTypeCosts).values([
      { wasteTypeId: medicalType.id, effectiveFrom: "2025-01-01", costPerKg: "15.00" },
      { wasteTypeId: hazardousType.id, effectiveFrom: "2025-01-01", costPerKg: "25.00" },
      { wasteTypeId: domesticType.id, effectiveFrom: "2025-01-01", costPerKg: "2.00" },
      { wasteTypeId: recycleType.id, effectiveFrom: "2025-01-01", costPerKg: "-1.00" },
    ]);

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Seed error:", error);
  }
}
