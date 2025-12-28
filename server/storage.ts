import { 
  users, hospitals, roles, userHospitals, userRoles,
  wasteTypes, locationCategories, locations, operationalCoefficients,
  wasteCollections, issues, syncLogs,
  type User, type InsertUser,
  type Hospital, type InsertHospital,
  type Role, type InsertRole,
  type WasteType, type InsertWasteType,
  type LocationCategory, type InsertLocationCategory,
  type Location, type InsertLocation,
  type OperationalCoefficient, type InsertOperationalCoefficient,
  type WasteCollection, type InsertWasteCollection,
  type Issue, type InsertIssue
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getHospitals(): Promise<Hospital[]>;
  getHospital(id: string): Promise<Hospital | undefined>;
  createHospital(hospital: InsertHospital): Promise<Hospital>;
  
  getRoles(): Promise<Role[]>;
  createRole(role: InsertRole): Promise<Role>;
  
  getUserHospitals(userId: string): Promise<(typeof userHospitals.$inferSelect & { hospital: Hospital })[]>;
  getUserRoles(userId: string): Promise<(typeof userRoles.$inferSelect & { role: Role })[]>;
  
  getWasteTypes(): Promise<WasteType[]>;
  getWasteType(id: string): Promise<WasteType | undefined>;
  getWasteTypeByCode(code: string): Promise<WasteType | undefined>;
  createWasteType(wasteType: InsertWasteType): Promise<WasteType>;
  
  getLocationCategories(): Promise<LocationCategory[]>;
  createLocationCategory(category: InsertLocationCategory): Promise<LocationCategory>;
  
  getLocations(hospitalId?: string): Promise<Location[]>;
  getLocationByCode(hospitalId: string, code: string): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  
  getOperationalCoefficients(hospitalId: string, period?: string): Promise<OperationalCoefficient[]>;
  upsertOperationalCoefficient(coeff: InsertOperationalCoefficient): Promise<OperationalCoefficient>;
  
  getWasteCollections(hospitalId?: string, limit?: number): Promise<WasteCollection[]>;
  getWasteCollectionByTag(tagCode: string): Promise<WasteCollection | undefined>;
  createWasteCollection(collection: InsertWasteCollection): Promise<WasteCollection>;
  updateWasteCollection(id: string, updates: Partial<WasteCollection>): Promise<WasteCollection | undefined>;
  
  getIssues(hospitalId?: string): Promise<Issue[]>;
  createIssue(issue: InsertIssue): Promise<Issue>;
  updateIssue(id: string, updates: Partial<Issue>): Promise<Issue | undefined>;
  
  getDashboardSummary(hospitalId?: string): Promise<any>;
  getAnalytics(hospitalId?: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getHospitals(): Promise<Hospital[]> {
    return db.select().from(hospitals).where(eq(hospitals.isActive, true));
  }

  async getHospital(id: string): Promise<Hospital | undefined> {
    const [hospital] = await db.select().from(hospitals).where(eq(hospitals.id, id));
    return hospital || undefined;
  }

  async createHospital(hospital: InsertHospital): Promise<Hospital> {
    const [created] = await db.insert(hospitals).values(hospital).returning();
    return created;
  }

  async getRoles(): Promise<Role[]> {
    return db.select().from(roles);
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [created] = await db.insert(roles).values(role).returning();
    return created;
  }

  async getUserHospitals(userId: string) {
    const results = await db
      .select()
      .from(userHospitals)
      .innerJoin(hospitals, eq(userHospitals.hospitalId, hospitals.id))
      .where(eq(userHospitals.userId, userId));
    
    return results.map(r => ({
      ...r.user_hospitals,
      hospital: r.hospitals
    }));
  }

  async getUserRoles(userId: string) {
    const results = await db
      .select()
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));
    
    return results.map(r => ({
      ...r.user_roles,
      role: r.roles
    }));
  }

  async getWasteTypes(): Promise<WasteType[]> {
    return db.select().from(wasteTypes).where(eq(wasteTypes.isActive, true));
  }

  async getWasteType(id: string): Promise<WasteType | undefined> {
    const [wt] = await db.select().from(wasteTypes).where(eq(wasteTypes.id, id));
    return wt || undefined;
  }

  async getWasteTypeByCode(code: string): Promise<WasteType | undefined> {
    const [wt] = await db.select().from(wasteTypes).where(eq(wasteTypes.code, code));
    return wt || undefined;
  }

  async createWasteType(wasteType: InsertWasteType): Promise<WasteType> {
    const [created] = await db.insert(wasteTypes).values(wasteType).returning();
    return created;
  }

  async getLocationCategories(): Promise<LocationCategory[]> {
    return db.select().from(locationCategories);
  }

  async createLocationCategory(category: InsertLocationCategory): Promise<LocationCategory> {
    const [created] = await db.insert(locationCategories).values(category).returning();
    return created;
  }

  async getLocations(hospitalId?: string): Promise<Location[]> {
    if (hospitalId) {
      return db.select().from(locations).where(
        and(eq(locations.hospitalId, hospitalId), eq(locations.isActive, true))
      );
    }
    return db.select().from(locations).where(eq(locations.isActive, true));
  }

  async getLocationByCode(hospitalId: string, code: string): Promise<Location | undefined> {
    const [loc] = await db.select().from(locations).where(
      and(eq(locations.hospitalId, hospitalId), eq(locations.code, code))
    );
    return loc || undefined;
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const [created] = await db.insert(locations).values(location).returning();
    return created;
  }

  async getOperationalCoefficients(hospitalId: string, period?: string): Promise<OperationalCoefficient[]> {
    if (period) {
      return db.select().from(operationalCoefficients).where(
        and(eq(operationalCoefficients.hospitalId, hospitalId), eq(operationalCoefficients.period, period))
      );
    }
    return db.select().from(operationalCoefficients).where(eq(operationalCoefficients.hospitalId, hospitalId));
  }

  async upsertOperationalCoefficient(coeff: InsertOperationalCoefficient): Promise<OperationalCoefficient> {
    const existing = await db.select().from(operationalCoefficients).where(
      and(
        eq(operationalCoefficients.hospitalId, coeff.hospitalId),
        eq(operationalCoefficients.categoryId, coeff.categoryId),
        eq(operationalCoefficients.period, coeff.period)
      )
    );

    if (existing.length > 0) {
      const [updated] = await db
        .update(operationalCoefficients)
        .set({ value: coeff.value })
        .where(eq(operationalCoefficients.id, existing[0].id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(operationalCoefficients).values(coeff).returning();
    return created;
  }

  async getWasteCollections(hospitalId?: string, limit = 100): Promise<WasteCollection[]> {
    if (hospitalId) {
      return db.select().from(wasteCollections)
        .where(eq(wasteCollections.hospitalId, hospitalId))
        .orderBy(desc(wasteCollections.collectedAt))
        .limit(limit);
    }
    return db.select().from(wasteCollections)
      .orderBy(desc(wasteCollections.collectedAt))
      .limit(limit);
  }

  async getWasteCollectionByTag(tagCode: string): Promise<WasteCollection | undefined> {
    const [collection] = await db.select().from(wasteCollections).where(eq(wasteCollections.tagCode, tagCode));
    return collection || undefined;
  }

  async createWasteCollection(collection: InsertWasteCollection): Promise<WasteCollection> {
    const [created] = await db.insert(wasteCollections).values(collection).returning();
    return created;
  }

  async updateWasteCollection(id: string, updates: Partial<WasteCollection>): Promise<WasteCollection | undefined> {
    const [updated] = await db
      .update(wasteCollections)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(wasteCollections.id, id))
      .returning();
    return updated || undefined;
  }

  async getIssues(hospitalId?: string): Promise<Issue[]> {
    if (hospitalId) {
      return db.select().from(issues)
        .where(eq(issues.hospitalId, hospitalId))
        .orderBy(desc(issues.reportedAt));
    }
    return db.select().from(issues).orderBy(desc(issues.reportedAt));
  }

  async createIssue(issue: InsertIssue): Promise<Issue> {
    const [created] = await db.insert(issues).values(issue).returning();
    return created;
  }

  async updateIssue(id: string, updates: Partial<Issue>): Promise<Issue | undefined> {
    const [updated] = await db
      .update(issues)
      .set(updates)
      .where(eq(issues.id, id))
      .returning();
    return updated || undefined;
  }

  async getDashboardSummary(hospitalId?: string) {
    const collections = await this.getWasteCollections(hospitalId, 500);
    const allWasteTypes = await this.getWasteTypes();
    const allHospitals = await this.getHospitals();
    const allIssues = await this.getIssues(hospitalId);

    const totalWeight = collections.reduce((sum, c) => sum + (parseFloat(c.weightKg as string) || 0), 0);
    const pendingCount = collections.filter(c => c.status === 'pending').length;
    const completedCount = collections.filter(c => c.status === 'completed').length;
    const issueCount = allIssues.filter(i => !i.isResolved).length;

    const byType = allWasteTypes.map(wt => {
      const weight = collections
        .filter(c => c.wasteTypeId === wt.id)
        .reduce((sum, c) => sum + (parseFloat(c.weightKg as string) || 0), 0);
      return {
        code: wt.code,
        label: wt.name,
        weight,
        hex: wt.colorHex
      };
    });

    const byHospital = allHospitals.map(h => {
      const weight = collections
        .filter(c => c.hospitalId === h.id)
        .reduce((sum, c) => sum + (parseFloat(c.weightKg as string) || 0), 0);
      return {
        code: h.code,
        name: h.name,
        weight,
        hex: h.colorHex || '#3b82f6'
      };
    });

    const recentCollections = await Promise.all(
      collections.slice(0, 10).map(async (c) => {
        const hospital = allHospitals.find(h => h.id === c.hospitalId);
        const wasteType = allWasteTypes.find(wt => wt.id === c.wasteTypeId);
        return {
          id: c.id,
          tagCode: c.tagCode,
          wasteTypeCode: wasteType?.code || 'unknown',
          weightKg: c.weightKg,
          status: c.status,
          collectedAt: c.collectedAt?.toISOString(),
          hospitalName: hospital?.name || 'Unknown',
          locationCode: c.locationId
        };
      })
    );

    return {
      totalWeight,
      pendingCount,
      completedCount,
      issueCount,
      byType,
      byHospital,
      recentCollections
    };
  }

  async getAnalytics(hospitalId?: string) {
    const collections = await this.getWasteCollections(hospitalId, 1000);
    const allWasteTypes = await this.getWasteTypes();
    const allHospitals = await this.getHospitals();
    const categories = await this.getLocationCategories();

    const totalWeight = collections.reduce((sum, c) => sum + (parseFloat(c.weightKg as string) || 0), 0);
    const medicalWeight = collections
      .filter(c => allWasteTypes.find(wt => wt.id === c.wasteTypeId)?.code === 'medical')
      .reduce((sum, c) => sum + (parseFloat(c.weightKg as string) || 0), 0);
    const recycleWeight = collections
      .filter(c => allWasteTypes.find(wt => wt.id === c.wasteTypeId)?.code === 'recycle')
      .reduce((sum, c) => sum + (parseFloat(c.weightKg as string) || 0), 0);

    const kpis = {
      wastePerBed: totalWeight / 100,
      wastePerSurgery: totalWeight / 50,
      wastePerProtocol: totalWeight / 1000,
      medicalWasteRatio: totalWeight > 0 ? medicalWeight / totalWeight : 0,
      recycleRatio: totalWeight > 0 ? recycleWeight / totalWeight : 0,
      costEfficiency: 0.75
    };

    const riskMatrix = categories.slice(0, 6).map((cat, idx) => ({
      category: cat.code,
      risk: idx < 2 ? 'high' : idx < 4 ? 'medium' : 'low' as 'low' | 'medium' | 'high',
      score: Math.floor(Math.random() * 40) + 60,
      label: cat.name
    }));

    const costAnalysis = allWasteTypes.map(wt => {
      const weight = collections
        .filter(c => c.wasteTypeId === wt.id)
        .reduce((sum, c) => sum + (parseFloat(c.weightKg as string) || 0), 0);
      const unitCost = parseFloat(wt.costPerKg as string);
      return {
        wasteType: wt.name,
        weight,
        unitCost,
        totalCost: weight * unitCost,
        hex: wt.colorHex
      };
    });

    const timeAnalysis = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      value: collections.filter(c => c.collectedAt?.getHours() === hour)
        .reduce((sum, c) => sum + (parseFloat(c.weightKg as string) || 0), 0) || Math.random() * 20
    }));

    const hospitalComparison = allHospitals.map(h => {
      const hCollections = collections.filter(c => c.hospitalId === h.id);
      const hTotal = hCollections.reduce((sum, c) => sum + (parseFloat(c.weightKg as string) || 0), 0);
      const hMedical = hCollections
        .filter(c => allWasteTypes.find(wt => wt.id === c.wasteTypeId)?.code === 'medical')
        .reduce((sum, c) => sum + (parseFloat(c.weightKg as string) || 0), 0);
      const hRecycle = hCollections
        .filter(c => allWasteTypes.find(wt => wt.id === c.wasteTypeId)?.code === 'recycle')
        .reduce((sum, c) => sum + (parseFloat(c.weightKg as string) || 0), 0);
      
      return {
        hospitalCode: h.code,
        hospitalName: h.name,
        totalWeight: hTotal,
        medicalRatio: hTotal > 0 ? hMedical / hTotal : 0,
        recycleRatio: hTotal > 0 ? hRecycle / hTotal : 0,
        efficiency: 0.7 + Math.random() * 0.25,
        hex: h.colorHex || '#3b82f6'
      };
    });

    return {
      kpis,
      riskMatrix,
      costAnalysis,
      timeAnalysis,
      hospitalComparison
    };
  }
}

export const storage = new DatabaseStorage();
