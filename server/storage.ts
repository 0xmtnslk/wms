import { 
  users, hospitals, roles, userHospitals, userRoles,
  wasteTypes, locationCategories, locations, operationalCoefficients, wasteTypeCosts,
  wasteCollections, issues, syncLogs,
  type User, type InsertUser,
  type Hospital, type InsertHospital,
  type Role, type InsertRole,
  type WasteType, type InsertWasteType,
  type LocationCategory, type InsertLocationCategory,
  type Location, type InsertLocation,
  type OperationalCoefficient, type InsertOperationalCoefficient,
  type WasteTypeCost, type InsertWasteTypeCost,
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
  updateLocationCategory(id: string, updates: Partial<LocationCategory>): Promise<LocationCategory | undefined>;
  
  getLocations(hospitalId?: string): Promise<Location[]>;
  getLocationByCode(hospitalId: string, code: string): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: string, updates: Partial<Location>): Promise<Location | undefined>;
  
  getOperationalCoefficients(hospitalId: string, period?: string): Promise<OperationalCoefficient[]>;
  upsertOperationalCoefficient(coeff: InsertOperationalCoefficient): Promise<OperationalCoefficient>;
  
  getWasteTypeCosts(): Promise<WasteTypeCost[]>;
  getEffectiveCostForDate(wasteTypeId: string, date: Date): Promise<WasteTypeCost | undefined>;
  upsertWasteTypeCost(wasteTypeId: string, effectiveFrom: string, costPerKg: string): Promise<WasteTypeCost>;
  
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

  async updateLocationCategory(id: string, updates: Partial<LocationCategory>): Promise<LocationCategory | undefined> {
    const [updated] = await db.update(locationCategories)
      .set(updates)
      .where(eq(locationCategories.id, id))
      .returning();
    return updated;
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

  async updateLocation(id: string, updates: Partial<Location>): Promise<Location | undefined> {
    const [updated] = await db
      .update(locations)
      .set(updates)
      .where(eq(locations.id, id))
      .returning();
    return updated || undefined;
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

  async getWasteTypeCosts(): Promise<WasteTypeCost[]> {
    return db.select().from(wasteTypeCosts).orderBy(desc(wasteTypeCosts.effectiveFrom));
  }

  async getEffectiveCostForDate(wasteTypeId: string, date: Date): Promise<WasteTypeCost | undefined> {
    const dateStr = date.toISOString().split('T')[0];
    const [cost] = await db.select().from(wasteTypeCosts).where(
      and(
        eq(wasteTypeCosts.wasteTypeId, wasteTypeId),
        sql`${wasteTypeCosts.effectiveFrom} <= ${dateStr}`
      )
    ).orderBy(desc(wasteTypeCosts.effectiveFrom)).limit(1);
    return cost || undefined;
  }

  async upsertWasteTypeCost(wasteTypeId: string, effectiveFrom: string, costPerKg: string): Promise<WasteTypeCost> {
    const existing = await db.select().from(wasteTypeCosts).where(
      and(
        eq(wasteTypeCosts.wasteTypeId, wasteTypeId),
        eq(wasteTypeCosts.effectiveFrom, effectiveFrom)
      )
    );

    if (existing.length > 0) {
      const [updated] = await db
        .update(wasteTypeCosts)
        .set({ costPerKg, updatedAt: new Date() })
        .where(eq(wasteTypeCosts.id, existing[0].id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(wasteTypeCosts).values({
      wasteTypeId,
      effectiveFrom,
      costPerKg
    }).returning();
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

    const hospitalsData = allHospitals.map(h => {
      const hospitalCollections = collections.filter(c => c.hospitalId === h.id);
      const hospitalIssues = allIssues.filter(i => i.hospitalId === h.id && !i.isResolved);
      const lastCollection = hospitalCollections
        .filter(c => c.collectedAt)
        .sort((a, b) => new Date(b.collectedAt!).getTime() - new Date(a.collectedAt!).getTime())[0];
      
      return {
        id: h.id,
        code: h.code,
        name: h.name,
        totalWeight: hospitalCollections.reduce((sum, c) => sum + (parseFloat(c.weightKg as string) || 0), 0),
        pendingCount: hospitalCollections.filter(c => c.status === 'pending').length,
        completedCount: hospitalCollections.filter(c => c.status === 'completed').length,
        issueCount: hospitalIssues.length,
        lastCollectionAt: lastCollection?.collectedAt?.toISOString() || null
      };
    });

    return {
      totalWeight,
      pendingCount,
      completedCount,
      issueCount,
      byType,
      byHospital,
      hospitals: hospitalsData,
      recentCollections
    };
  }

  async getAnalytics(hospitalId?: string) {
    const allCollections = await this.getWasteCollections(undefined, 5000);
    const collections = hospitalId 
      ? allCollections.filter(c => c.hospitalId === hospitalId)
      : allCollections;
    const allWasteTypes = await this.getWasteTypes();
    const allHospitals = await this.getHospitals();
    const categories = await this.getLocationCategories();
    const allIssues = await this.getIssues();
    const issues = hospitalId ? allIssues.filter(i => i.hospitalId === hospitalId) : allIssues;

    const totalWeight = collections.reduce((sum, c) => sum + (parseFloat(c.weightKg as string) || 0), 0);
    const medicalWeight = collections
      .filter(c => allWasteTypes.find(wt => wt.id === c.wasteTypeId)?.code === 'medical')
      .reduce((sum, c) => sum + (parseFloat(c.weightKg as string) || 0), 0);
    const recycleWeight = collections
      .filter(c => allWasteTypes.find(wt => wt.id === c.wasteTypeId)?.code === 'recycle')
      .reduce((sum, c) => sum + (parseFloat(c.weightKg as string) || 0), 0);

    const hospitalCount = hospitalId ? 1 : allHospitals.length;
    const kpis = {
      wastePerBed: totalWeight / Math.max(hospitalCount * 100, 1),
      wastePerSurgery: totalWeight / Math.max(hospitalCount * 50, 1),
      wastePerProtocol: totalWeight / Math.max(hospitalCount * 1000, 1),
      medicalWasteRatio: totalWeight > 0 ? medicalWeight / totalWeight : 0,
      recycleRatio: totalWeight > 0 ? recycleWeight / totalWeight : 0,
      costEfficiency: totalWeight > 0 ? Math.min((recycleWeight / totalWeight) + 0.5, 1) : 0.5,
      totalHospitals: hospitalCount,
      totalCollections: collections.length,
      isFiltered: !!hospitalId
    };

    const categoryRanking = allWasteTypes.map(wt => {
      const weight = collections
        .filter(c => c.wasteTypeId === wt.id)
        .reduce((sum, c) => sum + (parseFloat(c.weightKg as string) || 0), 0);
      return {
        code: wt.code,
        name: wt.name,
        weight,
        percentage: totalWeight > 0 ? (weight / totalWeight) * 100 : 0,
        hex: wt.colorHex
      };
    }).sort((a, b) => b.weight - a.weight);

    const openIssues = issues.filter(i => !i.isResolved);
    const issuesByCategory: Record<string, number> = {};
    openIssues.forEach(i => {
      issuesByCategory[i.category] = (issuesByCategory[i.category] || 0) + 1;
    });

    const riskMatrix = {
      totalIssues: issues.length,
      openIssues: openIssues.length,
      resolvedIssues: issues.filter(i => i.isResolved).length,
      byCategory: Object.entries(issuesByCategory).map(([category, count]) => ({
        category,
        count,
        severity: count > 5 ? 'high' : count > 2 ? 'medium' : 'low' as 'low' | 'medium' | 'high'
      })),
      overallRisk: openIssues.length > 10 ? 'high' : openIssues.length > 5 ? 'medium' : 'low' as 'low' | 'medium' | 'high',
      riskScore: Math.min(100, openIssues.length * 10)
    };

    const costAnalysis = allWasteTypes.map(wt => {
      const weight = collections
        .filter(c => c.wasteTypeId === wt.id)
        .reduce((sum, c) => sum + (parseFloat(c.weightKg as string) || 0), 0);
      const unitCost = parseFloat(wt.costPerKg as string);
      return {
        wasteType: wt.name,
        code: wt.code,
        weight,
        unitCost,
        totalCost: weight * unitCost,
        hex: wt.colorHex
      };
    });

    const totalCost = costAnalysis.reduce((sum, c) => sum + c.totalCost, 0);

    let hospitalCosts: { id: string; code: string; name: string; totalCost: number; totalWeight: number; hex: string }[] = [];
    let bestHospitals: typeof hospitalCosts = [];
    let worstHospitals: typeof hospitalCosts = [];

    if (!hospitalId) {
      hospitalCosts = allHospitals.map(h => {
        const hCollections = allCollections.filter(c => c.hospitalId === h.id);
        let hCost = 0;
        hCollections.forEach(c => {
          const wt = allWasteTypes.find(w => w.id === c.wasteTypeId);
          if (wt) {
            hCost += (parseFloat(c.weightKg as string) || 0) * parseFloat(wt.costPerKg as string);
          }
        });
        return {
          id: h.id,
          code: h.code,
          name: h.name,
          totalCost: hCost,
          totalWeight: hCollections.reduce((sum, c) => sum + (parseFloat(c.weightKg as string) || 0), 0),
          hex: h.colorHex || '#3b82f6'
        };
      });

      const sortedByCost = [...hospitalCosts].sort((a, b) => a.totalCost - b.totalCost);
      bestHospitals = sortedByCost.slice(0, 3);
      worstHospitals = sortedByCost.slice(-3).reverse();
    }

    const timeAnalysis = Array.from({ length: 24 }, (_, hour) => {
      const hourCollections = collections.filter(c => c.collectedAt?.getHours() === hour);
      return {
        hour,
        count: hourCollections.length,
        weight: hourCollections.reduce((sum, c) => sum + (parseFloat(c.weightKg as string) || 0), 0)
      };
    });

    const shiftAnalysis = [
      { name: "Sabah (08-16)", hours: [8,9,10,11,12,13,14,15], count: 0, weight: 0 },
      { name: "Akşam (16-24)", hours: [16,17,18,19,20,21,22,23], count: 0, weight: 0 },
      { name: "Gece (00-08)", hours: [0,1,2,3,4,5,6,7], count: 0, weight: 0 }
    ];

    shiftAnalysis.forEach(shift => {
      shift.hours.forEach(h => {
        const ta = timeAnalysis.find(t => t.hour === h);
        if (ta) {
          shift.count += ta.count;
          shift.weight += ta.weight;
        }
      });
    });

    const avgCollectionTime = collections.length > 0 
      ? collections.filter(c => c.weighedAt && c.collectedAt)
          .map(c => (new Date(c.weighedAt!).getTime() - new Date(c.collectedAt!).getTime()) / 60000)
          .reduce((sum, t, _, arr) => sum + t / arr.length, 0)
      : 15;

    let hospitalTimeStats: { id: string; code: string; name: string; avgCollectionTime: number; totalWeight: number; collectionsCount: number; issueCount: number; hex: string }[] = [];
    
    if (!hospitalId) {
      hospitalTimeStats = allHospitals.map(h => {
        const hCollections = allCollections.filter(c => c.hospitalId === h.id);
        const hIssues = allIssues.filter(i => i.hospitalId === h.id);
        const avgTime = hCollections.length > 0 
          ? hCollections.filter(c => c.weighedAt && c.collectedAt)
              .map(c => (new Date(c.weighedAt!).getTime() - new Date(c.collectedAt!).getTime()) / 60000)
              .reduce((sum, t, _, arr) => sum + t / arr.length, 0) || 15
          : 15;
        
        return {
          id: h.id,
          code: h.code,
          name: h.name,
          avgCollectionTime: avgTime,
          totalWeight: hCollections.reduce((sum, c) => sum + (parseFloat(c.weightKg as string) || 0), 0),
          collectionsCount: hCollections.length,
          issueCount: hIssues.filter(i => !i.isResolved).length,
          hex: h.colorHex || '#3b82f6'
        };
      });
    }

    return {
      kpis,
      categoryRanking,
      riskMatrix,
      costAnalysis,
      totalCost,
      hospitalCosts,
      bestHospitals,
      worstHospitals,
      timeAnalysis,
      shiftAnalysis,
      avgCollectionTime,
      hospitalTimeStats
    };
  }

  async getHospitalPerformance(startDate?: Date, endDate?: Date) {
    const allHospitals = await this.getHospitals();
    const allWasteTypes = await this.getWasteTypes();
    const allCategories = await this.getLocationCategories();
    const allLocations = await db.select().from(locations);
    const allOpCoefficients = await db.select().from(operationalCoefficients);
    
    let collectionsQuery = db.select().from(wasteCollections);
    let allCollections = await collectionsQuery;
    
    if (startDate) {
      allCollections = allCollections.filter(c => c.collectedAt && new Date(c.collectedAt) >= startDate);
    }
    if (endDate) {
      allCollections = allCollections.filter(c => c.collectedAt && new Date(c.collectedAt) <= endDate);
    }

    const hospitalPerformances = allHospitals.map(hospital => {
      const hCollections = allCollections.filter(c => c.hospitalId === hospital.id);
      const hLocations = allLocations.filter(l => l.hospitalId === hospital.id);
      
      let totalWeight = 0;
      let medicalWeight = 0;
      let hazardousWeight = 0;
      let domesticWeight = 0;
      let recycleWeight = 0;

      hCollections.forEach(c => {
        const wt = allWasteTypes.find(w => w.id === c.wasteTypeId);
        const weight = parseFloat(c.weightKg as string) || 0;
        totalWeight += weight;
        if (wt?.code === 'medical') medicalWeight += weight;
        if (wt?.code === 'hazardous') hazardousWeight += weight;
        if (wt?.code === 'domestic') domesticWeight += weight;
        if (wt?.code === 'recycle') recycleWeight += weight;
      });

      const categoryBreakdown = allCategories.map(cat => {
        const catLocations = hLocations.filter(l => l.categoryId === cat.id);
        const catLocationIds = catLocations.map(l => l.id);
        const catCollections = hCollections.filter(c => c.locationId && catLocationIds.includes(c.locationId));
        
        let catMedical = 0, catHazardous = 0, catDomestic = 0, catRecycle = 0;
        catCollections.forEach(c => {
          const wt = allWasteTypes.find(w => w.id === c.wasteTypeId);
          const weight = parseFloat(c.weightKg as string) || 0;
          if (wt?.code === 'medical') catMedical += weight;
          if (wt?.code === 'hazardous') catHazardous += weight;
          if (wt?.code === 'domestic') catDomestic += weight;
          if (wt?.code === 'recycle') catRecycle += weight;
        });

        const catTotal = catMedical + catHazardous + catDomestic + catRecycle;
        
        const opCoef = allOpCoefficients.find(
          oc => oc.hospitalId === hospital.id && oc.categoryId === cat.id
        );
        const opData = opCoef ? parseFloat(opCoef.value as string) : 
          (cat.code === 'icu' ? 450 : cat.code === 'ward' ? 1200 : cat.code === 'surgery' ? 180 : 
           cat.code === 'outpatient' ? 5000 : cat.code === 'admin' ? 50 : 1);

        const kpi = opData > 0 ? catTotal / opData : 0;
        const refFactor = parseFloat(cat.referenceWasteFactor as string) || 1.0;
        const impact = refFactor > 0 ? ((refFactor - kpi) / refFactor) * 10 : 10;

        return {
          categoryId: cat.id,
          categoryName: cat.name,
          medicalKg: catMedical,
          hazardousKg: catHazardous,
          domesticKg: catDomestic,
          recycleKg: catRecycle,
          totalKg: catTotal,
          opData,
          kpi,
          impact: Math.max(-10, Math.min(10, impact))
        };
      });

      const totalOpData = categoryBreakdown.reduce((sum, c) => sum + c.opData, 0);
      const wasteIndex = totalOpData > 0 ? totalWeight / (totalOpData * 0.1) : 0;
      const score = Math.max(0, Math.min(100, Math.round(100 - (wasteIndex * 30))));

      return {
        id: hospital.id,
        code: hospital.code,
        name: hospital.name,
        hex: hospital.colorHex || '#3b82f6',
        score,
        wasteIndex,
        totalWeight,
        isLeader: false,
        categoryBreakdown
      };
    });

    hospitalPerformances.sort((a, b) => b.score - a.score);
    if (hospitalPerformances.length > 0) {
      hospitalPerformances[0].isLeader = true;
    }

    return { hospitals: hospitalPerformances };
  }

  async getCrossComparison(metric: string, hospitalFilter: string, categoryFilter: string) {
    const allHospitals = await this.getHospitals();
    const allWasteTypes = await this.getWasteTypes();
    const allLocations = await db.select().from(locations);
    let allCollections = await db.select().from(wasteCollections);

    const hospitalIds = hospitalFilter !== "all" ? hospitalFilter.split(',').filter(Boolean) : [];
    if (hospitalIds.length > 0) {
      allCollections = allCollections.filter(c => hospitalIds.includes(c.hospitalId));
    }

    if (categoryFilter !== "all") {
      const categoryLocations = allLocations.filter(l => l.categoryId === categoryFilter);
      const locationIds = categoryLocations.map(l => l.id);
      allCollections = allCollections.filter(c => c.locationId && locationIds.includes(c.locationId));
    }

    const hospitalsToShow = hospitalIds.length > 0
      ? allHospitals.filter(h => hospitalIds.includes(h.id))
      : allHospitals;

    const comparisonData = hospitalsToShow.map(hospital => {
      const hCollections = allCollections.filter(c => c.hospitalId === hospital.id);
      
      let weight = 0, cost = 0;
      let medicalKg = 0, hazardousKg = 0, domesticKg = 0, recycleKg = 0;

      hCollections.forEach(c => {
        const wt = allWasteTypes.find(w => w.id === c.wasteTypeId);
        const w = parseFloat(c.weightKg as string) || 0;
        weight += w;
        cost += w * (wt ? parseFloat(wt.costPerKg as string) : 0);
        if (wt?.code === 'medical') medicalKg += w;
        if (wt?.code === 'hazardous') hazardousKg += w;
        if (wt?.code === 'domestic') domesticKg += w;
        if (wt?.code === 'recycle') recycleKg += w;
      });

      const volume = hCollections.length;
      const efficiency = weight > 0 ? recycleKg / weight : 0;

      return {
        id: hospital.id,
        code: hospital.code,
        name: hospital.name,
        hex: hospital.colorHex || '#3b82f6',
        weight,
        cost,
        efficiency,
        volume,
        medicalKg,
        hazardousKg,
        domesticKg,
        recycleKg
      };
    });

    const sortKey = metric === "efficiency" ? "efficiency" : 
                    metric === "cost" ? "cost" : 
                    metric === "volume" ? "volume" :
                    metric === "medical" ? "medicalKg" :
                    metric === "hazardous" ? "hazardousKg" :
                    metric === "domestic" ? "domesticKg" :
                    metric === "recycle" ? "recycleKg" : "weight";

    comparisonData.sort((a, b) => (b as any)[sortKey] - (a as any)[sortKey]);

    return { hospitals: comparisonData };
  }
}

export const storage = new DatabaseStorage();
