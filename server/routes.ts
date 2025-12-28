import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { 
  loginSchema, insertWasteCollectionSchema, insertIssueSchema 
} from "@shared/schema";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

async function hasManagerRole(userId: string): Promise<boolean> {
  const userRoles = await storage.getUserRoles(userId);
  return userRoles.some(ur => ur.role.name === "HQ" || ur.role.name === "HOSPITAL_MANAGER");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.use(session({
    secret: process.env.SESSION_SECRET || "waste-management-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    }
  }));

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.userId = user.id;
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const userHospitals = await storage.getUserHospitals(user.id);
      const userRoles = await storage.getUserRoles(user.id);

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: userRoles.map(ur => ur.role.name) as any[],
        hospitals: userHospitals.map(uh => ({
          id: uh.hospital.id,
          code: uh.hospital.code,
          name: uh.hospital.name,
          colorHex: uh.hospital.colorHex,
          isDefault: uh.isDefault
        }))
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/hospitals", requireAuth, async (req, res) => {
    try {
      const hospitals = await storage.getHospitals();
      res.json(hospitals);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/waste-types", requireAuth, async (req, res) => {
    try {
      const wasteTypes = await storage.getWasteTypes();
      res.json(wasteTypes);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/dashboard/summary", requireAuth, async (req, res) => {
    try {
      const hospitalId = req.query.hospitalId as string | undefined;
      const summary = await storage.getDashboardSummary(hospitalId);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics", requireAuth, async (req, res) => {
    try {
      const hospitalId = req.query.hospitalId as string | undefined;
      const analytics = await storage.getAnalytics(hospitalId);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/settings/location-categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getLocationCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/settings/locations/:hospitalId", requireAuth, async (req, res) => {
    try {
      const hospitalId = req.params.hospitalId;
      const locationsList = await storage.getLocations(hospitalId);
      const categories = await storage.getLocationCategories();
      
      const enriched = locationsList.map(loc => ({
        ...loc,
        categoryName: categories.find(c => c.id === loc.categoryId)?.name
      }));
      
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/settings/locations", requireAuth, async (req, res) => {
    try {
      const locationsList = await storage.getLocations();
      const categories = await storage.getLocationCategories();
      
      const enriched = locationsList.map(loc => ({
        ...loc,
        categoryName: categories.find(c => c.id === loc.categoryId)?.name
      }));
      
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/settings/locations", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const isManager = await hasManagerRole(userId);
      
      if (!isManager) {
        return res.status(403).json({ error: "Only managers can create locations" });
      }

      const { hospitalId, categoryId, customLabel } = req.body;
      
      if (!hospitalId || !categoryId) {
        return res.status(400).json({ error: "hospitalId and categoryId required" });
      }

      const hospital = await storage.getHospital(hospitalId);
      if (!hospital) {
        return res.status(404).json({ error: "Hospital not found" });
      }

      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `${hospital.code}-${timestamp}-${random}`;

      const location = await storage.createLocation({
        hospitalId,
        categoryId,
        customLabel: customLabel || null,
        code,
        isActive: true
      });

      const categories = await storage.getLocationCategories();
      const enriched = {
        ...location,
        categoryName: categories.find(c => c.id === location.categoryId)?.name
      };

      res.json(enriched);
    } catch (error) {
      console.error("Create location error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/settings/locations/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const isManager = await hasManagerRole(userId);
      
      if (!isManager) {
        return res.status(403).json({ error: "Only managers can update locations" });
      }

      const { id } = req.params;
      const { isActive } = req.body;

      const updated = await storage.updateLocation(id, { isActive });
      if (!updated) {
        return res.status(404).json({ error: "Location not found" });
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/settings/operational-coefficients/:hospitalId", requireAuth, async (req, res) => {
    try {
      const hospitalId = req.params.hospitalId;
      const period = req.query.period as string | undefined;

      const coefficients = await storage.getOperationalCoefficients(hospitalId, period);
      const categories = await storage.getLocationCategories();
      
      const enriched = coefficients.map(c => ({
        ...c,
        categoryName: categories.find(cat => cat.id === c.categoryId)?.name
      }));
      
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/settings/operational-coefficients", requireAuth, async (req, res) => {
    try {
      const { hospitalId, period, values } = req.body;
      
      for (const v of values) {
        await storage.upsertOperationalCoefficient({
          hospitalId,
          categoryId: v.categoryId,
          period,
          value: v.value.toString()
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/waste/collections", requireAuth, async (req, res) => {
    try {
      const hospitalId = req.query.hospitalId as string | undefined;
      const collections = await storage.getWasteCollections(hospitalId);
      res.json(collections);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/waste/collections", requireAuth, async (req, res) => {
    try {
      const { hospitalId, locationCode, wasteTypeCode, tagCode } = req.body;
      
      const wasteType = await storage.getWasteTypeByCode(wasteTypeCode);
      if (!wasteType) {
        return res.status(400).json({ error: "Invalid waste type" });
      }

      let locationId = null;
      if (locationCode) {
        const location = await storage.getLocationByCode(hospitalId, locationCode);
        locationId = location?.id || null;
      }

      const collection = await storage.createWasteCollection({
        hospitalId,
        locationId,
        wasteTypeId: wasteType.id,
        tagCode,
        collectedByUserId: req.session.userId,
        status: "pending"
      });

      res.json(collection);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/waste/collections/:tagCode/weigh", requireAuth, async (req, res) => {
    try {
      const { tagCode } = req.params;
      const { weightKg, isManualWeight } = req.body;

      const collection = await storage.getWasteCollectionByTag(tagCode);
      if (!collection) {
        return res.status(404).json({ error: "Collection not found" });
      }

      const updated = await storage.updateWasteCollection(collection.id, {
        weightKg: weightKg.toString(),
        isManualWeight: isManualWeight ?? true,
        weighedAt: new Date(),
        status: "completed"
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/issues", requireAuth, async (req, res) => {
    try {
      const hospitalId = req.query.hospitalId as string | undefined;
      const issuesList = await storage.getIssues(hospitalId);
      const allHospitals = await storage.getHospitals();
      
      const enriched = await Promise.all(issuesList.map(async (issue) => {
        const hospital = allHospitals.find(h => h.id === issue.hospitalId);
        const reporter = issue.reportedByUserId ? await storage.getUser(issue.reportedByUserId) : null;
        
        return {
          ...issue,
          hospitalName: hospital?.name || 'Unknown',
          reportedByName: reporter ? `${reporter.firstName || ''} ${reporter.lastName || reporter.username}`.trim() : 'Unknown'
        };
      }));
      
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/issues", requireAuth, async (req, res) => {
    try {
      const { hospitalId, category, tagCode, description } = req.body;

      let wasteCollectionId = null;
      if (tagCode) {
        const collection = await storage.getWasteCollectionByTag(tagCode);
        wasteCollectionId = collection?.id || null;
      }

      const issue = await storage.createIssue({
        hospitalId,
        wasteCollectionId,
        tagCode: tagCode || null,
        category,
        description,
        reportedByUserId: req.session.userId,
        isResolved: false
      });

      res.json(issue);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/issues/:id/resolve", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const updated = await storage.updateIssue(id, {
        isResolved: true,
        resolvedAt: new Date()
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return httpServer;
}
