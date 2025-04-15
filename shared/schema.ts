import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tenant status
export const TenantStatus = {
  PROSPECT: 'prospect',
  APPLICATION: 'application',
  APPROVED: 'approved',
  ACTIVE: 'active',
  PAST: 'past'
} as const;

// User roles
export const UserRole = {
  GUEST: 'guest',
  MANAGER: 'manager',
  OWNER: 'owner',
  VENDOR: 'vendor',
  ACCOUNTANT: 'accountant'
} as const;

// Ad placement locations
export const AdPlacement = {
  SIDEBAR: 'sidebar',
  HEADER: 'header',
  LISTING: 'listing',
  FOOTER: 'footer'
} as const;

// New Transaction Categories
export const BusinessVendor = {
  REI: 'rei',
  HOME_DEPOT: 'homedepot',
  HOA: 'hoa',
  AMAZON: 'amazon',
  LOWES: 'lowes'
} as const;

export const TransactionCategory = {
  RENT: 'rent',
  MAINTENANCE: 'maintenance',
  UTILITIES: 'utilities',
  INSURANCE: 'insurance',
  TAXES: 'taxes',
  MORTGAGE: 'mortgage',
  SUPPLIES: 'supplies',
  CLEANING: 'cleaning',
  MARKETING: 'marketing',
  OTHER: 'other'
} as const;

// New Transaction Types
export const TransactionType = {
  INCOME: 'income',
  EXPENSE: 'expense'
} as const;

// Add payment status enum
export const PaymentStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;

// Add Mercury Bank related enums
export const MercuryAccountType = {
  CHECKING: 'checking',
  SAVINGS: 'savings'
} as const;

export const MercuryTransactionType = {
  CREDIT: 'credit',
  DEBIT: 'debit'
} as const;

// Add OpenPhone related enums
export const CallDirection = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound'
} as const;

export const CallStatus = {
  COMPLETED: 'completed',
  MISSED: 'missed',
  VOICEMAIL: 'voicemail',
  REJECTED: 'rejected'
} as const;

export const MessageDirection = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound'
} as const;

// Asset types and status
export const AssetType = {
  APPLIANCE: 'appliance',
  FURNITURE: 'furniture',
  ELECTRONICS: 'electronics',
  TOOLS: 'tools',
  FIXTURES: 'fixtures'
} as const;

export const AssetStatus = {
  IN_USE: 'in_use',
  IN_STORAGE: 'in_storage',
  MAINTENANCE: 'maintenance',
  RETIRED: 'retired'
} as const;

export const CapitalTransactionType = {
  CONTRIBUTION: 'contribution',
  DISTRIBUTION: 'distribution',
  INVESTMENT: 'investment',
  RETURN: 'return'
} as const;

export const capitalAccounts = pgTable("capital_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default('0'),
  totalContributions: decimal("total_contributions", { precision: 10, scale: 2 }).notNull().default('0'),
  totalDistributions: decimal("total_distributions", { precision: 10, scale: 2 }).notNull().default('0'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const capitalTransactions = pgTable("capital_transactions", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => capitalAccounts.id),
  type: text("type", { enum: ["contribution", "distribution", "investment", "return"] }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  transactionDate: timestamp("transaction_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id),
  name: text("name").notNull(),
  type: text("type", { enum: ["appliance", "furniture", "electronics", "tools", "fixtures"] }).notNull(),
  purchaseDate: timestamp("purchase_date").notNull(),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).notNull(),
  status: text("status", { enum: ["in_use", "in_storage", "maintenance", "retired"] }).notNull(),
  vendor: text("vendor"),
  model: text("model"),
  serialNumber: text("serial_number"),
  warrantyExpiration: timestamp("warranty_expiration"),
  lastMaintenanceDate: timestamp("last_maintenance_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["guest", "manager", "owner", "vendor", "accountant"] }).notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
});

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  ownerId: integer("owner_id").references(() => users.id),
  rentAmount: decimal("rent_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status", { enum: ['available', 'occupied', 'maintenance'] }).notNull(),
  // External IDs for integration
  externalId: text("external_id"),
  externalSource: text("external_source"),
  // Add external platform IDs
  airbnbId: text("airbnb_id"),
  zillowId: text("zillow_id"),
  bookingId: text("booking_id"),
  apartmentsId: text("apartments_id"),
  furnishedFinderId: text("furnished_finder_id"),
  // Additional property info
  units: integer("units").default(1),
  bedrooms: integer("bedrooms").default(0),
  bathrooms: integer("bathrooms").default(0),
  squareFeet: integer("square_feet").default(0),
  amenities: text("amenities").array(),
  images: text("images").array(),
  description: text("description"),
  securityDepositAmount: decimal("security_deposit_amount", { precision: 10, scale: 2 }),
  securityDepositStatus: text("security_deposit_status", { enum: ['pending', 'held', 'released'] }),
  securityDepositHoldDate: timestamp("security_deposit_hold_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const maintenanceRequests = pgTable("maintenance_requests", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id),
  unitId: text("unit_id"),
  requestedBy: integer("requested_by").references(() => users.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  vendorId: integer("vendor_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status", { enum: ['pending', 'assigned', 'in_progress', 'completed'] }).notNull(),
  dueDate: timestamp("due_date"),
  notifyResident: boolean("notify_resident").default(true),
  requiresResidentApproval: boolean("requires_resident_approval").default(false),
  residentApprovalStatus: text("resident_approval_status", { enum: ['pending', 'approved', 'rejected'] }),
  residentApprovalDate: timestamp("resident_approval_date"),
  entryNoticeStatus: text("entry_notice_status", { enum: ['not_required', 'pending', 'sent', 'acknowledged'] }).default('not_required'),
  entryNoticeDate: timestamp("entry_notice_date"),
  photos: text("photos").array(),
  progressNotes: text("progress_notes").array(),
  auditLog: text("audit_log").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const advertisements = pgTable("advertisements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  targetUrl: text("target_url").notNull(),
  placement: text("placement", { enum: ["sidebar", "header", "listing", "footer"] }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// New Financial Tables
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  category: text("category", { enum: ["rent", "maintenance", "utilities", "insurance", "taxes", "mortgage", "supplies", "cleaning", "marketing", "other"] }).notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  aiCategorized: boolean("ai_categorized").default(false),
  aiConfidence: decimal("ai_confidence", { precision: 5, scale: 2 }),
  receipt: text("receipt_url"),
  externalId: text("external_id"),
  externalSource: text("external_source", { enum: ["doorloop", "mercury", "wave", "manual", "quickbooks"] }),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

export const financialReports = pgTable("financial_reports", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type", { enum: ['monthly', 'quarterly', 'annual', 'custom'] }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  propertyId: integer("property_id").references(() => properties.id),
  summary: text("summary"),
  aiInsights: text("ai_insights"),
  metrics: text("metrics").notNull(), // JSON string of key metrics
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Add payment table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").notNull(), // ChargeAutomation payment ID
  propertyId: integer("property_id").references(() => properties.id),
  tenantId: integer("tenant_id").references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  processingFee: decimal("processing_fee", { precision: 10, scale: 2 }),
  status: text("status", { enum: ["pending", "completed", "failed"] }).notNull(),
  description: text("description").notNull(),
  dueDate: timestamp("due_date").notNull(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Define business types
export const BusinessType = {
  LLC: 'llc',
  CORPORATION: 'corporation',
  SOLE_PROPRIETORSHIP: 'sole_proprietorship',
  PARTNERSHIP: 'partnership',
  NON_PROFIT: 'non_profit',
  OTHER: 'other'
} as const;

// Define tax treatment types
export const TaxTreatment = {
  DISREGARDED_ENTITY: 'disregarded_entity',
  CORPORATION: 'corporation',
  S_CORPORATION: 's_corporation',
  PARTNERSHIP: 'partnership',
  NON_PROFIT: 'non_profit'
} as const;

// Define relationship types
export const RelationshipType = {
  PARENT: 'parent',
  SUBSIDIARY: 'subsidiary',
  SIBLING: 'sibling',
  MANAGER: 'manager',
  OWNER: 'owner',
  SERVICE_PROVIDER: 'service_provider',
  OTHER: 'other'
} as const;

// Add Business Accounts table
export const businessAccounts = pgTable("business_accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  legalName: text("legal_name").notNull(),
  taxId: text("tax_id"),
  businessType: text("business_type", { 
    enum: ["llc", "corporation", "sole_proprietorship", "partnership", "non_profit", "other"] 
  }).default('llc'),
  taxTreatment: text("tax_treatment", { 
    enum: ["disregarded_entity", "corporation", "s_corporation", "partnership", "non_profit"] 
  }),
  fiscalYearEnd: text("fiscal_year_end"),
  description: text("description"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country").default('USA'),
  isActive: boolean("is_active").notNull().default(true),
  primaryOwnerId: integer("primary_owner_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Business Relationships (parent-child, owner, manager, etc.)
export const businessRelationships = pgTable("business_relationships", {
  id: serial("id").primaryKey(),
  fromBusinessId: integer("from_business_id").references(() => businessAccounts.id).notNull(),
  toBusinessId: integer("to_business_id").references(() => businessAccounts.id).notNull(),
  relationshipType: text("relationship_type", { 
    enum: ["parent", "subsidiary", "sibling", "manager", "owner", "service_provider", "other"] 
  }).notNull(),
  ownershipPercentage: decimal("ownership_percentage", { precision: 5, scale: 2 }),
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Owner/Member information for entities
export const businessOwners = pgTable("business_owners", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessAccounts.id).notNull(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  email: text("email"),
  taxId: text("tax_id"),
  ownershipPercentage: decimal("ownership_percentage", { precision: 5, scale: 2 }).notNull(),
  isManageringMember: boolean("is_managing_member").default(false),
  profitSharePercentage: decimal("profit_share_percentage", { precision: 5, scale: 2 }),
  lossSharePercentage: decimal("loss_share_percentage", { precision: 5, scale: 2 }),
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Tax year settings and filing information
export const businessTaxYears = pgTable("business_tax_years", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessAccounts.id).notNull(),
  year: integer("year").notNull(),
  filingStatus: text("filing_status", { 
    enum: ["not_filed", "filed", "extended", "amended", "audited"] 
  }).notNull().default('not_filed'),
  federalFilingId: text("federal_filing_id"),
  stateFilingId: text("state_filing_id"),
  filingDueDate: timestamp("filing_due_date"),
  extendedDueDate: timestamp("extended_due_date"),
  actualFilingDate: timestamp("actual_filing_date"),
  taxPaid: decimal("tax_paid", { precision: 10, scale: 2 }),
  notes: text("notes"),
  documentsUploaded: boolean("documents_uploaded").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Add Mercury API Credentials table
export const mercuryCredentials = pgTable("mercury_credentials", {
  id: serial("id").primaryKey(),
  businessAccountId: integer("business_account_id").references(() => businessAccounts.id),
  apiKey: text("api_key").notNull(),
  isValid: boolean("is_valid").notNull().default(true),
  lastValidated: timestamp("last_validated").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Static IP configurations for businesses
export const staticIpConfigs = pgTable("static_ip_configs", {
  id: serial("id").primaryKey(),
  businessAccountId: integer("business_account_id").references(() => businessAccounts.id).notNull(),
  proxyUrl: text("proxy_url").notNull(),
  apiKey: text("api_key").notNull(),
  secret: text("secret").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  ipAddress: text("ip_address"),
  status: text("status", { enum: ["inactive", "pending", "active"] }).notNull().default('inactive'),
  lastChecked: timestamp("last_checked"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Add Mercury Bank tables
export const mercuryAccounts = pgTable("mercury_accounts", {
  id: serial("id").primaryKey(),
  businessAccountId: integer("business_account_id").references(() => businessAccounts.id),
  externalId: text("external_id").notNull(), // Mercury account ID
  name: text("name").notNull(),
  type: text("type", { enum: ["checking", "savings"] }).notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default('USD'),
  lastSyncedAt: timestamp("last_synced_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const mercuryTransactions = pgTable("mercury_transactions", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").notNull(), // Mercury transaction ID
  accountId: integer("account_id").references(() => mercuryAccounts.id),
  type: text("type", { enum: ["credit", "debit"] }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  counterpartyName: text("counterparty_name"),
  transactionDate: timestamp("transaction_date").notNull(),
  status: text("status", { enum: ['pending', 'posted'] }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Add OpenPhone phonelines table
export const openPhoneLines = pgTable("openphone_lines", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").notNull(), // OpenPhone phone line ID
  phoneNumber: text("phone_number").notNull(),
  name: text("name").notNull(),
  assignedTo: integer("assigned_to").references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  lastSyncedAt: timestamp("last_synced_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Add OpenPhone contacts table
export const openPhoneContacts = pgTable("openphone_contacts", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").notNull(), // OpenPhone contact ID
  phoneNumber: text("phone_number").notNull(),
  name: text("name"),
  email: text("email"),
  propertyId: integer("property_id").references(() => properties.id),
  notes: text("notes"),
  tags: text("tags").array(),
  lastContactedAt: timestamp("last_contacted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Add OpenPhone calls table
export const openPhoneCalls = pgTable("openphone_calls", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").notNull(), // OpenPhone call ID
  phoneLineId: integer("phone_line_id").references(() => openPhoneLines.id),
  contactId: integer("contact_id").references(() => openPhoneContacts.id),
  direction: text("direction", { enum: ['inbound', 'outbound'] }).notNull(),
  status: text("status", { enum: ['completed', 'missed', 'voicemail', 'rejected'] }).notNull(),
  duration: integer("duration").notNull(), // in seconds
  recordingUrl: text("recording_url"),
  notes: text("notes"),
  callDate: timestamp("call_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Add OpenPhone messages table
export const openPhoneMessages = pgTable("openphone_messages", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").notNull(), // OpenPhone message ID
  phoneLineId: integer("phone_line_id").references(() => openPhoneLines.id),
  contactId: integer("contact_id").references(() => openPhoneContacts.id),
  direction: text("direction", { enum: ['inbound', 'outbound'] }).notNull(),
  content: text("content").notNull(),
  mediaUrls: text("media_urls").array(),
  isRead: boolean("is_read").notNull().default(false),
  messageDate: timestamp("message_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Add Tenants table
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  propertyId: integer("property_id").references(() => properties.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  status: text("status", { enum: ["prospect", "application", "approved", "active", "past"] }).notNull().default('prospect'),
  leaseStart: timestamp("lease_start"),
  leaseEnd: timestamp("lease_end"),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }),
  securityDeposit: decimal("security_deposit", { precision: 10, scale: 2 }),
  backgroundCheckStatus: text("background_check_status", { enum: ['pending', 'approved', 'rejected', 'not_started'] }),
  notes: text("notes"),
  documents: text("documents").array(),
  externalId: text("external_id"), // External system ID (e.g. DoorLoop)
  externalSource: text("external_source"), // External system name
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  fullName: true,
  email: true,
});

export const insertPropertySchema = createInsertSchema(properties);
export const insertMaintenanceRequestSchema = createInsertSchema(maintenanceRequests);
export const insertAdvertisementSchema = createInsertSchema(advertisements).omit({
  impressions: true,
  clicks: true,
  createdAt: true,
});
export const insertTransactionSchema = createInsertSchema(transactions).omit({
  aiCategorized: true,
  aiConfidence: true,
  createdAt: true,
});

export const insertFinancialReportSchema = createInsertSchema(financialReports).omit({
  createdAt: true,
});

// Add insert schema for payments
export const insertPaymentSchema = createInsertSchema(payments).omit({
  externalId: true,
  processingFee: true,
  paidAt: true,
  createdAt: true
});

// Add Asset insert schema
export const insertAssetSchema = createInsertSchema(assets).omit({
  createdAt: true,
});

// Add business account and mercury credential schemas
export const insertBusinessAccountSchema = createInsertSchema(businessAccounts).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertMercuryCredentialSchema = createInsertSchema(mercuryCredentials).omit({
  createdAt: true,
  updatedAt: true,
  lastValidated: true,
});

// Add insert schemas
export const insertMercuryAccountSchema = createInsertSchema(mercuryAccounts).omit({
  createdAt: true,
});

export const insertMercuryTransactionSchema = createInsertSchema(mercuryTransactions).omit({
  createdAt: true,
});

// Add OpenPhone insert schemas
export const insertOpenPhoneLineSchema = createInsertSchema(openPhoneLines).extend({
  createdAt: z.date().optional().default(() => new Date()),
});

export const insertOpenPhoneContactSchema = createInsertSchema(openPhoneContacts).extend({
  createdAt: z.date().optional().default(() => new Date()),
});

export const insertOpenPhoneCallSchema = createInsertSchema(openPhoneCalls).extend({
  createdAt: z.date().optional().default(() => new Date()),
});

export const insertOpenPhoneMessageSchema = createInsertSchema(openPhoneMessages).extend({
  createdAt: z.date().optional().default(() => new Date()),
});

// Add tenant insert schema
export const insertTenantSchema = createInsertSchema(tenants).omit({
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Property = typeof properties.$inferSelect;
export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
export type Advertisement = typeof advertisements.$inferSelect;
export type InsertAdvertisement = z.infer<typeof insertAdvertisementSchema>;

// New types
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type FinancialReport = typeof financialReports.$inferSelect;
export type InsertFinancialReport = z.infer<typeof insertFinancialReportSchema>;

// Add types
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// Add Asset types
export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;

// Add Business Account types
export type BusinessAccount = typeof businessAccounts.$inferSelect;
export type InsertBusinessAccount = z.infer<typeof insertBusinessAccountSchema>;
export type MercuryCredential = typeof mercuryCredentials.$inferSelect;
export type InsertMercuryCredential = z.infer<typeof insertMercuryCredentialSchema>;
export type StaticIpConfig = typeof staticIpConfigs.$inferSelect;

// Insert schema for static IP config
export const insertStaticIpConfigSchema = createInsertSchema(staticIpConfigs).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertStaticIpConfig = z.infer<typeof insertStaticIpConfigSchema>;

// Add types
export type MercuryAccount = typeof mercuryAccounts.$inferSelect;
export type InsertMercuryAccount = z.infer<typeof insertMercuryAccountSchema>;
export type MercuryTransaction = typeof mercuryTransactions.$inferSelect;
export type InsertMercuryTransaction = z.infer<typeof insertMercuryTransactionSchema>;

// Add OpenPhone types
export type OpenPhoneLine = typeof openPhoneLines.$inferSelect;
export type InsertOpenPhoneLine = z.infer<typeof insertOpenPhoneLineSchema>;
export type OpenPhoneContact = typeof openPhoneContacts.$inferSelect;
export type InsertOpenPhoneContact = z.infer<typeof insertOpenPhoneContactSchema>;
export type OpenPhoneCall = typeof openPhoneCalls.$inferSelect;
export type InsertOpenPhoneCall = z.infer<typeof insertOpenPhoneCallSchema>;
export type OpenPhoneMessage = typeof openPhoneMessages.$inferSelect;
export type InsertOpenPhoneMessage = z.infer<typeof insertOpenPhoneMessageSchema>;

// Add Tenant types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;