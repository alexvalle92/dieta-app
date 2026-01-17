import { pgTable, uuid, text, timestamp, date, boolean, varchar, integer, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const patients = pgTable("patients", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull().default(""),
  cpf: text("cpf").notNull(),
  phone: text("phone").notNull(),
  birthDate: date("birth_date"),
  gender: text("gender"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  cpf: text("cpf").notNull(),
  phone: text("phone").notNull(),
  crn: text("crn").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const mealPlans = pgTable("meal_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  dueDateNewMealPlan: date("due_date_new_meal_plan"),
  paymentUrlNewMealPlan: text("payment_url_new_meal_plan"),
  status: text("status").notNull().default("active"),
  planData: jsonb("plan_data").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const recipes = pgTable("recipes", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  ingredients: text("ingredients").array().notNull().default([]),
  preparation: text("preparation").notNull(),
  tips: text("tips"),
  prepTime: integer("prep_time"),
  servings: integer("servings"),
  calories: integer("calories"),
  category: text("category"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  paymentDate: date("payment_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const patientsRelations = relations(patients, ({ many }) => ({
  mealPlans: many(mealPlans),
  passwordResetTokens: many(passwordResetTokens),
  payments: many(payments),
}));

export const mealPlansRelations = relations(mealPlans, ({ one }) => ({
  patient: one(patients, {
    fields: [mealPlans.patientId],
    references: [patients.id],
  }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  patient: one(patients, {
    fields: [passwordResetTokens.patientId],
    references: [patients.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  patient: one(patients, {
    fields: [payments.patientId],
    references: [patients.id],
  }),
}));

export const appSettings = pgTable("app_settings", {
  id: text("id").primaryKey().default("global"),
  dietTechnicalDefinition: text("diet_technical_definition").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const mealCategories = pgTable("meal_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const allowedMealItems = pgTable("allowed_meal_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  mealCategoryId: uuid("meal_category_id").notNull().references(() => mealCategories.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(), // 'food' or 'recipe'
  foodName: text("food_name"),
  recipeId: uuid("recipe_id").references(() => recipes.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const mealCategoriesRelations = relations(mealCategories, ({ many }) => ({
  allowedItems: many(allowedMealItems),
}));

export const allowedMealItemsRelations = relations(allowedMealItems, ({ one }) => ({
  category: one(mealCategories, {
    fields: [allowedMealItems.mealCategoryId],
    references: [mealCategories.id],
  }),
  recipe: one(recipes, {
    fields: [allowedMealItems.recipeId],
    references: [recipes.id],
  }),
}));

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = typeof patients.$inferInsert;
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = typeof admins.$inferInsert;
export type MealPlan = typeof mealPlans.$inferSelect;
export type InsertMealPlan = typeof mealPlans.$inferInsert;
export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = typeof recipes.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
