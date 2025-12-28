import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, boolean, decimal, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sourceSystemEnum = pgEnum("source_system", ["oracle", "ad", "mixed", "local"]);
export const collectionStatusEnum = pgEnum("collection_status", ["pending", "completed", "cancelled"]);
export const issueCategoryEnum = pgEnum("issue_category", ["segregation", "non_compliance", "technical", "other"]);
export const syncStatusEnum = pgEnum("sync_status", ["success", "failed", "in_progress"]);

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  externalId: varchar("external_id", { length: 100 }),
  username: text("username").notNull().unique(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  password: text("password").notNull(),
  isActive: boolean("is_active").default(true),
  sourceSystem: sourceSystemEnum("source_system").default("local"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const hospitals = pgTable("hospitals", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  externalId: varchar("external_id", { length: 100 }),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  colorHex: varchar("color_hex", { length: 7 }).default("#3b82f6"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const roles = pgTable("roles", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  externalId: varchar("external_id", { length: 100 }),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description"),
});

export const userHospitals = pgTable("user_hospitals", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  hospitalId: varchar("hospital_id", { length: 36 }).notNull().references(() => hospitals.id),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  roleId: varchar("role_id", { length: 36 }).notNull().references(() => roles.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wasteTypes = pgTable("waste_types", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  colorHex: varchar("color_hex", { length: 7 }).notNull(),
  costPerKg: decimal("cost_per_kg", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
});

export const locationCategories = pgTable("location_categories", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  referenceWasteFactor: decimal("reference_waste_factor", { precision: 10, scale: 2 }).default("1.0"),
});

export const locations = pgTable("locations", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  hospitalId: varchar("hospital_id", { length: 36 }).notNull().references(() => hospitals.id),
  code: varchar("code", { length: 100 }).notNull(),
  categoryId: varchar("category_id", { length: 36 }).references(() => locationCategories.id),
  customLabel: text("custom_label"),
  isActive: boolean("is_active").default(true),
});

export const operationalCoefficients = pgTable("operational_coefficients", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  hospitalId: varchar("hospital_id", { length: 36 }).notNull().references(() => hospitals.id),
  categoryId: varchar("category_id", { length: 36 }).notNull().references(() => locationCategories.id),
  period: varchar("period", { length: 7 }).notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wasteCollections = pgTable("waste_collections", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  hospitalId: varchar("hospital_id", { length: 36 }).notNull().references(() => hospitals.id),
  locationId: varchar("location_id", { length: 36 }).references(() => locations.id),
  wasteTypeId: varchar("waste_type_id", { length: 36 }).notNull().references(() => wasteTypes.id),
  tagCode: varchar("tag_code", { length: 50 }).notNull(),
  collectedByUserId: varchar("collected_by_user_id", { length: 36 }).references(() => users.id),
  collectedAt: timestamp("collected_at").defaultNow(),
  weighedAt: timestamp("weighed_at"),
  status: collectionStatusEnum("status").default("pending"),
  weightKg: decimal("weight_kg", { precision: 10, scale: 3 }),
  isManualWeight: boolean("is_manual_weight").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const issues = pgTable("issues", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  hospitalId: varchar("hospital_id", { length: 36 }).notNull().references(() => hospitals.id),
  wasteCollectionId: varchar("waste_collection_id", { length: 36 }).references(() => wasteCollections.id),
  tagCode: varchar("tag_code", { length: 50 }),
  category: issueCategoryEnum("category").notNull(),
  description: text("description").notNull(),
  reportedByUserId: varchar("reported_by_user_id", { length: 36 }).references(() => users.id),
  photoUrl: text("photo_url"),
  reportedAt: timestamp("reported_at").defaultNow(),
  isResolved: boolean("is_resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
});

export const syncLogs = pgTable("sync_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  sourceSystem: text("source_system").notNull(),
  syncType: text("sync_type").notNull(),
  status: syncStatusEnum("status").notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  finishedAt: timestamp("finished_at"),
  details: text("details"),
});

export const usersRelations = relations(users, ({ many }) => ({
  userHospitals: many(userHospitals),
  userRoles: many(userRoles),
  wasteCollections: many(wasteCollections),
  issues: many(issues),
}));

export const hospitalsRelations = relations(hospitals, ({ many }) => ({
  userHospitals: many(userHospitals),
  locations: many(locations),
  operationalCoefficients: many(operationalCoefficients),
  wasteCollections: many(wasteCollections),
  issues: many(issues),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
}));

export const userHospitalsRelations = relations(userHospitals, ({ one }) => ({
  user: one(users, { fields: [userHospitals.userId], references: [users.id] }),
  hospital: one(hospitals, { fields: [userHospitals.hospitalId], references: [hospitals.id] }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
}));

export const locationCategoriesRelations = relations(locationCategories, ({ many }) => ({
  locations: many(locations),
  operationalCoefficients: many(operationalCoefficients),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  hospital: one(hospitals, { fields: [locations.hospitalId], references: [hospitals.id] }),
  category: one(locationCategories, { fields: [locations.categoryId], references: [locationCategories.id] }),
  wasteCollections: many(wasteCollections),
}));

export const operationalCoefficientsRelations = relations(operationalCoefficients, ({ one }) => ({
  hospital: one(hospitals, { fields: [operationalCoefficients.hospitalId], references: [hospitals.id] }),
  category: one(locationCategories, { fields: [operationalCoefficients.categoryId], references: [locationCategories.id] }),
}));

export const wasteCollectionsRelations = relations(wasteCollections, ({ one, many }) => ({
  hospital: one(hospitals, { fields: [wasteCollections.hospitalId], references: [hospitals.id] }),
  location: one(locations, { fields: [wasteCollections.locationId], references: [locations.id] }),
  wasteType: one(wasteTypes, { fields: [wasteCollections.wasteTypeId], references: [wasteTypes.id] }),
  collectedBy: one(users, { fields: [wasteCollections.collectedByUserId], references: [users.id] }),
  issues: many(issues),
}));

export const issuesRelations = relations(issues, ({ one }) => ({
  hospital: one(hospitals, { fields: [issues.hospitalId], references: [hospitals.id] }),
  wasteCollection: one(wasteCollections, { fields: [issues.wasteCollectionId], references: [wasteCollections.id] }),
  reportedBy: one(users, { fields: [issues.reportedByUserId], references: [users.id] }),
}));

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHospitalSchema = createInsertSchema(hospitals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRoleSchema = createInsertSchema(roles).omit({ id: true });
export const insertUserHospitalSchema = createInsertSchema(userHospitals).omit({ id: true, createdAt: true });
export const insertUserRoleSchema = createInsertSchema(userRoles).omit({ id: true, createdAt: true });
export const insertWasteTypeSchema = createInsertSchema(wasteTypes).omit({ id: true });
export const insertLocationCategorySchema = createInsertSchema(locationCategories).omit({ id: true });
export const insertLocationSchema = createInsertSchema(locations).omit({ id: true });
export const insertOperationalCoefficientSchema = createInsertSchema(operationalCoefficients).omit({ id: true, createdAt: true });
export const insertWasteCollectionSchema = createInsertSchema(wasteCollections).omit({ id: true, createdAt: true, updatedAt: true });
export const insertIssueSchema = createInsertSchema(issues).omit({ id: true, reportedAt: true, resolvedAt: true });
export const insertSyncLogSchema = createInsertSchema(syncLogs).omit({ id: true, startedAt: true, finishedAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertHospital = z.infer<typeof insertHospitalSchema>;
export type Hospital = typeof hospitals.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;
export type InsertUserHospital = z.infer<typeof insertUserHospitalSchema>;
export type UserHospital = typeof userHospitals.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRole = typeof userRoles.$inferSelect;
export type InsertWasteType = z.infer<typeof insertWasteTypeSchema>;
export type WasteType = typeof wasteTypes.$inferSelect;
export type InsertLocationCategory = z.infer<typeof insertLocationCategorySchema>;
export type LocationCategory = typeof locationCategories.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;
export type InsertOperationalCoefficient = z.infer<typeof insertOperationalCoefficientSchema>;
export type OperationalCoefficient = typeof operationalCoefficients.$inferSelect;
export type InsertWasteCollection = z.infer<typeof insertWasteCollectionSchema>;
export type WasteCollection = typeof wasteCollections.$inferSelect;
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type Issue = typeof issues.$inferSelect;
export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;
export type SyncLog = typeof syncLogs.$inferSelect;

export const loginSchema = z.object({
  username: z.string().min(1, "Kullanıcı adı gerekli"),
  password: z.string().min(1, "Şifre gerekli"),
});

export type LoginInput = z.infer<typeof loginSchema>;
