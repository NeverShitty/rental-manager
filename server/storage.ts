import { User, InsertUser, Property, MaintenanceRequest, Advertisement, InsertAdvertisement, Transaction, InsertTransaction, FinancialReport, InsertFinancialReport, Payment, MercuryAccount, InsertMercuryAccount, MercuryTransaction, InsertMercuryTransaction, OpenPhoneLine, InsertOpenPhoneLine, OpenPhoneContact, InsertOpenPhoneContact, OpenPhoneCall, InsertOpenPhoneCall, OpenPhoneMessage, InsertOpenPhoneMessage, Asset, StaticIpConfig, Tenant, InsertTenant } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Static IP operations
  getStaticIpConfig(businessAccountId?: number): Promise<StaticIpConfig | undefined>;
  saveStaticIpConfig(config: Omit<StaticIpConfig, "id" | "createdAt" | "updatedAt">): Promise<StaticIpConfig>;
  
  // Asset operations
  getAssets(): Promise<Asset[]>;
  getAsset(id: number): Promise<Asset | undefined>;
  getAssetsByProperty(propertyId: number): Promise<Asset[]>;
  createAsset(asset: Omit<Asset, "id">): Promise<Asset>;
  updateAsset(id: number, updates: Partial<Asset>): Promise<Asset>;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;

  // Property operations
  getProperties(): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  getPropertyByExternalId(externalId: string, externalSource: string): Promise<Property | undefined>;
  createProperty(property: Omit<Property, "id">): Promise<Property>;
  updateProperty(id: number, updates: Partial<Property>): Promise<Property>;

  // Maintenance operations
  getMaintenanceRequests(): Promise<MaintenanceRequest[]>;
  createMaintenanceRequest(request: Omit<MaintenanceRequest, "id">): Promise<MaintenanceRequest>;
  updateMaintenanceRequest(id: number, updates: Partial<MaintenanceRequest>): Promise<MaintenanceRequest>;

  // Advertisement operations
  getAdvertisements(): Promise<Advertisement[]>;
  getActiveAdvertisements(placement: string): Promise<Advertisement[]>;
  createAdvertisement(ad: InsertAdvertisement): Promise<Advertisement>;
  updateAdvertisement(id: number, updates: Partial<Advertisement>): Promise<Advertisement>;
  incrementAdStats(id: number, field: 'impressions' | 'clicks'): Promise<void>;

  // New financial operations
  createTransaction(transaction: Omit<Transaction, "id">): Promise<Transaction>;
  updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction>;
  getTransactionsByDateRange(startDate: Date, endDate: Date, propertyId?: number): Promise<Transaction[]>;
  getTransactionsByExternalId(externalId: string): Promise<Transaction[]>;
  createFinancialReport(report: Omit<FinancialReport, "id">): Promise<FinancialReport>;

  // Payment operations
  createPayment(payment: Omit<Payment, "id">): Promise<Payment>;
  getPayment(id: number): Promise<Payment | undefined>;
  updatePayment(id: number, updates: Partial<Payment>): Promise<Payment>;
  getPaymentsByProperty(propertyId: number): Promise<Payment[]>;

  // Mercury Bank operations
  createOrUpdateMercuryAccount(account: InsertMercuryAccount): Promise<MercuryAccount>;
  getMercuryAccounts(): Promise<MercuryAccount[]>;
  getMercuryAccount(id: number): Promise<MercuryAccount | undefined>;
  getLastMercurySync(externalId: string): Promise<Date | undefined>;
  createMercuryTransaction(transaction: InsertMercuryTransaction): Promise<MercuryTransaction>;
  getMercuryTransactions(accountId: number, startDate?: Date): Promise<MercuryTransaction[]>;

  // OpenPhone phone line operations
  createOrUpdateOpenPhoneLine(line: InsertOpenPhoneLine): Promise<OpenPhoneLine>;
  getOpenPhoneLines(): Promise<OpenPhoneLine[]>;
  getOpenPhoneLine(id: number): Promise<OpenPhoneLine | undefined>;
  getOpenPhoneLineByExternalId(externalId: string): Promise<OpenPhoneLine | undefined>;
  getOpenPhoneLinesByUser(userId: number): Promise<OpenPhoneLine[]>;
  updateOpenPhoneLine(id: number, updates: Partial<OpenPhoneLine>): Promise<OpenPhoneLine>;
  getLastOpenPhoneSync(): Promise<Date | undefined>;

  // OpenPhone contact operations
  createOrUpdateOpenPhoneContact(contact: InsertOpenPhoneContact): Promise<OpenPhoneContact>;
  getOpenPhoneContacts(): Promise<OpenPhoneContact[]>;
  getOpenPhoneContact(id: number): Promise<OpenPhoneContact | undefined>;
  getOpenPhoneContactByExternalId(externalId: string): Promise<OpenPhoneContact | undefined>;
  getOpenPhoneContactByPhoneNumber(phoneNumber: string): Promise<OpenPhoneContact | undefined>;
  getOpenPhoneContactsByProperty(propertyId: number): Promise<OpenPhoneContact[]>;
  updateOpenPhoneContact(id: number, updates: Partial<OpenPhoneContact>): Promise<OpenPhoneContact>;

  // OpenPhone call operations
  createOpenPhoneCall(call: InsertOpenPhoneCall): Promise<OpenPhoneCall>;
  getOpenPhoneCalls(phoneLineId?: number, contactId?: number): Promise<OpenPhoneCall[]>;
  getOpenPhoneCall(id: number): Promise<OpenPhoneCall | undefined>;
  getOpenPhoneCallsByDateRange(startDate: Date, endDate: Date, phoneLineId?: number): Promise<OpenPhoneCall[]>;
  updateOpenPhoneCall(id: number, updates: Partial<OpenPhoneCall>): Promise<OpenPhoneCall>;

  // OpenPhone message operations
  createOpenPhoneMessage(message: InsertOpenPhoneMessage): Promise<OpenPhoneMessage>;
  getOpenPhoneMessages(phoneLineId?: number, contactId?: number): Promise<OpenPhoneMessage[]>;
  getOpenPhoneMessage(id: number): Promise<OpenPhoneMessage | undefined>;
  getOpenPhoneMessagesByDateRange(startDate: Date, endDate: Date, phoneLineId?: number): Promise<OpenPhoneMessage[]>;
  markOpenPhoneMessageAsRead(id: number): Promise<OpenPhoneMessage>;
  updateOpenPhoneMessage(id: number, updates: Partial<OpenPhoneMessage>): Promise<OpenPhoneMessage>;

  // Tenant operations
  getTenants(): Promise<Tenant[]>;
  getTenantById(id: number): Promise<Tenant | undefined>;
  getTenantsByProperty(propertyId: number): Promise<Tenant[]>;
  getTenantByExternalId(externalId: string, externalSource: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: number, updates: Partial<Tenant>): Promise<Tenant>;
  deleteTenant(id: number): Promise<boolean>;

  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private properties: Map<number, Property>;
  private maintenanceRequests: Map<number, MaintenanceRequest>;
  private advertisements: Map<number, Advertisement>;
  private transactions: Map<number, Transaction>;
  private financialReports: Map<number, FinancialReport>;
  private payments: Map<number, Payment>;
  private mercuryAccounts: Map<number, MercuryAccount>;
  private mercuryTransactions: Map<number, MercuryTransaction>;
  private openPhoneLines: Map<number, OpenPhoneLine>;
  private openPhoneContacts: Map<number, OpenPhoneContact>;
  private openPhoneCalls: Map<number, OpenPhoneCall>;
  private openPhoneMessages: Map<number, OpenPhoneMessage>;
  private assets: Map<number, Asset>;
  private staticIpConfigs: Map<number, StaticIpConfig>;
  private tenants: Map<number, Tenant>;
  private currentIds: { [key: string]: number };
  private lastOpenPhoneSyncDate: Date | undefined;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.properties = new Map();
    this.maintenanceRequests = new Map();
    this.advertisements = new Map();
    this.transactions = new Map();
    this.financialReports = new Map();
    this.payments = new Map();
    this.mercuryAccounts = new Map();
    this.mercuryTransactions = new Map();
    this.openPhoneLines = new Map();
    this.openPhoneContacts = new Map();
    this.openPhoneCalls = new Map();
    this.openPhoneMessages = new Map();
    this.assets = new Map();
    this.staticIpConfigs = new Map();
    this.tenants = new Map();
    this.currentIds = {
      users: 1,
      properties: 1,
      maintenanceRequests: 1,
      advertisements: 1,
      transactions: 1,
      financialReports: 1,
      payments: 1,
      mercuryAccounts: 1,
      mercuryTransactions: 1,
      openPhoneLines: 1,
      openPhoneContacts: 1,
      openPhoneCalls: 1,
      openPhoneMessages: 1,
      assets: 1,
      staticIpConfigs: 1,
      tenants: 1
    };
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) throw new Error('User not found');

    const updated = { ...existing, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async getProperties(): Promise<Property[]> {
    return Array.from(this.properties.values());
  }

  async getProperty(id: number): Promise<Property | undefined> {
    return this.properties.get(id);
  }
  
  async getPropertyByExternalId(externalId: string, externalSource: string): Promise<Property | undefined> {
    return Array.from(this.properties.values()).find(
      property => property.externalId === externalId && property.externalSource === externalSource
    );
  }

  async createProperty(property: Omit<Property, "id">): Promise<Property> {
    const id = this.currentIds.properties++;
    const newProperty = { ...property, id };
    this.properties.set(id, newProperty);
    return newProperty;
  }

  async updateProperty(id: number, updates: Partial<Property>): Promise<Property> {
    const existing = this.properties.get(id);
    if (!existing) throw new Error('Property not found');

    const updated = { ...existing, ...updates };
    this.properties.set(id, updated);
    return updated;
  }

  async getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
    return Array.from(this.maintenanceRequests.values());
  }

  async createMaintenanceRequest(request: Omit<MaintenanceRequest, "id">): Promise<MaintenanceRequest> {
    const id = this.currentIds.maintenanceRequests++;
    const newRequest = { ...request, id };
    this.maintenanceRequests.set(id, newRequest);
    return newRequest;
  }

  async updateMaintenanceRequest(id: number, updates: Partial<MaintenanceRequest>): Promise<MaintenanceRequest> {
    const existing = this.maintenanceRequests.get(id);
    if (!existing) throw new Error('Maintenance request not found');

    const updated = { ...existing, ...updates };
    this.maintenanceRequests.set(id, updated);
    return updated;
  }

  async getAdvertisements(): Promise<Advertisement[]> {
    return Array.from(this.advertisements.values());
  }

  async getActiveAdvertisements(placement: string): Promise<Advertisement[]> {
    const now = new Date();
    return Array.from(this.advertisements.values()).filter(ad =>
      ad.placement === placement &&
      ad.isActive &&
      new Date(ad.startDate) <= now &&
      new Date(ad.endDate) >= now
    );
  }

  async createAdvertisement(ad: InsertAdvertisement): Promise<Advertisement> {
    const id = this.currentIds.advertisements++;
    const newAd: Advertisement = {
      ...ad,
      id,
      impressions: 0,
      clicks: 0,
      createdAt: new Date()
    };
    this.advertisements.set(id, newAd);
    return newAd;
  }

  async updateAdvertisement(id: number, updates: Partial<Advertisement>): Promise<Advertisement> {
    const existing = this.advertisements.get(id);
    if (!existing) throw new Error('Advertisement not found');

    const updated = { ...existing, ...updates };
    this.advertisements.set(id, updated);
    return updated;
  }

  async incrementAdStats(id: number, field: 'impressions' | 'clicks'): Promise<void> {
    const ad = this.advertisements.get(id);
    if (!ad) throw new Error('Advertisement not found');

    const updated = { ...ad, [field]: ad[field] + 1 };
    this.advertisements.set(id, updated);
  }

  async createTransaction(transaction: Omit<Transaction, "id">): Promise<Transaction> {
    const id = this.currentIds.transactions++;
    const newTransaction = { ...transaction, id };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  async updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction> {
    const existing = this.transactions.get(id);
    if (!existing) throw new Error('Transaction not found');

    const updated = { ...existing, ...updates };
    this.transactions.set(id, updated);
    return updated;
  }

  async getTransactionsByDateRange(startDate: Date, endDate: Date, propertyId?: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const matchesDateRange = transactionDate >= startDate && transactionDate <= endDate;
      return propertyId
        ? matchesDateRange && transaction.propertyId === propertyId
        : matchesDateRange;
    });
  }
  
  async getTransactionsByExternalId(externalId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(transaction => transaction.externalId === externalId);
  }

  async createFinancialReport(report: Omit<FinancialReport, "id">): Promise<FinancialReport> {
    const id = this.currentIds.financialReports++;
    const newReport = { ...report, id };
    this.financialReports.set(id, newReport);
    return newReport;
  }

  async createPayment(payment: Omit<Payment, "id">): Promise<Payment> {
    const id = this.currentIds.payments++;
    const newPayment = { ...payment, id };
    this.payments.set(id, newPayment);
    return newPayment;
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async updatePayment(id: number, updates: Partial<Payment>): Promise<Payment> {
    const existing = this.payments.get(id);
    if (!existing) throw new Error('Payment not found');

    const updated = { ...existing, ...updates };
    this.payments.set(id, updated);
    return updated;
  }

  async getPaymentsByProperty(propertyId: number): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(payment => payment.propertyId === propertyId);
  }

  async createOrUpdateMercuryAccount(account: InsertMercuryAccount): Promise<MercuryAccount> {
    const existing = Array.from(this.mercuryAccounts.values())
      .find(a => a.externalId === account.externalId);

    if (existing) {
      const updated = { ...existing, ...account };
      this.mercuryAccounts.set(existing.id, updated);
      return updated;
    }

    const id = this.currentIds.mercuryAccounts++;
    const newAccount: MercuryAccount = { ...account, id };
    this.mercuryAccounts.set(id, newAccount);
    return newAccount;
  }

  async getMercuryAccounts(): Promise<MercuryAccount[]> {
    return Array.from(this.mercuryAccounts.values());
  }

  async getMercuryAccount(id: number): Promise<MercuryAccount | undefined> {
    return this.mercuryAccounts.get(id);
  }

  async getLastMercurySync(externalId: string): Promise<Date | undefined> {
    const account = Array.from(this.mercuryAccounts.values())
      .find(a => a.externalId === externalId);
    return account?.lastSyncedAt;
  }

  async createMercuryTransaction(transaction: InsertMercuryTransaction): Promise<MercuryTransaction> {
    const id = this.currentIds.mercuryTransactions++;
    const newTransaction: MercuryTransaction = { ...transaction, id };
    this.mercuryTransactions.set(id, newTransaction);
    return newTransaction;
  }

  async getMercuryTransactions(accountId: number, startDate?: Date): Promise<MercuryTransaction[]> {
    return Array.from(this.mercuryTransactions.values())
      .filter(tx => {
        const matchesAccount = tx.accountId === accountId;
        if (!startDate) return matchesAccount;
        return matchesAccount && new Date(tx.transactionDate) >= startDate;
      });
  }

  // OpenPhone phone line operations
  async createOrUpdateOpenPhoneLine(line: InsertOpenPhoneLine): Promise<OpenPhoneLine> {
    const existing = Array.from(this.openPhoneLines.values())
      .find(l => l.externalId === line.externalId);

    if (existing) {
      const updated = { ...existing, ...line };
      this.openPhoneLines.set(existing.id, updated);
      return updated;
    }

    const id = this.currentIds.openPhoneLines++;
    const newLine: OpenPhoneLine = { ...line, id };
    this.openPhoneLines.set(id, newLine);

    // Update the last sync date
    this.lastOpenPhoneSyncDate = new Date();
    return newLine;
  }

  async getOpenPhoneLines(): Promise<OpenPhoneLine[]> {
    return Array.from(this.openPhoneLines.values());
  }

  async getOpenPhoneLine(id: number): Promise<OpenPhoneLine | undefined> {
    return this.openPhoneLines.get(id);
  }

  async getOpenPhoneLineByExternalId(externalId: string): Promise<OpenPhoneLine | undefined> {
    return Array.from(this.openPhoneLines.values())
      .find(line => line.externalId === externalId);
  }

  async getOpenPhoneLinesByUser(userId: number): Promise<OpenPhoneLine[]> {
    return Array.from(this.openPhoneLines.values())
      .filter(line => line.assignedTo === userId);
  }

  async updateOpenPhoneLine(id: number, updates: Partial<OpenPhoneLine>): Promise<OpenPhoneLine> {
    const existing = this.openPhoneLines.get(id);
    if (!existing) throw new Error('OpenPhone line not found');

    const updated = { ...existing, ...updates };
    this.openPhoneLines.set(id, updated);
    return updated;
  }

  async getLastOpenPhoneSync(): Promise<Date | undefined> {
    return this.lastOpenPhoneSyncDate;
  }

  // OpenPhone contact operations
  async createOrUpdateOpenPhoneContact(contact: InsertOpenPhoneContact): Promise<OpenPhoneContact> {
    const existing = Array.from(this.openPhoneContacts.values())
      .find(c => c.externalId === contact.externalId);

    if (existing) {
      const updated = { ...existing, ...contact };
      this.openPhoneContacts.set(existing.id, updated);
      return updated;
    }

    const id = this.currentIds.openPhoneContacts++;
    const newContact: OpenPhoneContact = { ...contact, id };
    this.openPhoneContacts.set(id, newContact);
    return newContact;
  }

  async getOpenPhoneContacts(): Promise<OpenPhoneContact[]> {
    return Array.from(this.openPhoneContacts.values());
  }

  async getOpenPhoneContact(id: number): Promise<OpenPhoneContact | undefined> {
    return this.openPhoneContacts.get(id);
  }

  async getOpenPhoneContactByExternalId(externalId: string): Promise<OpenPhoneContact | undefined> {
    return Array.from(this.openPhoneContacts.values())
      .find(contact => contact.externalId === externalId);
  }

  async getOpenPhoneContactByPhoneNumber(phoneNumber: string): Promise<OpenPhoneContact | undefined> {
    return Array.from(this.openPhoneContacts.values())
      .find(contact => contact.phoneNumber === phoneNumber);
  }

  async getOpenPhoneContactsByProperty(propertyId: number): Promise<OpenPhoneContact[]> {
    return Array.from(this.openPhoneContacts.values())
      .filter(contact => contact.propertyId === propertyId);
  }

  async updateOpenPhoneContact(id: number, updates: Partial<OpenPhoneContact>): Promise<OpenPhoneContact> {
    const existing = this.openPhoneContacts.get(id);
    if (!existing) throw new Error('OpenPhone contact not found');

    const updated = { ...existing, ...updates };
    this.openPhoneContacts.set(id, updated);
    return updated;
  }

  // OpenPhone call operations
  async createOpenPhoneCall(call: InsertOpenPhoneCall): Promise<OpenPhoneCall> {
    const id = this.currentIds.openPhoneCalls++;
    const newCall: OpenPhoneCall = { ...call, id };
    this.openPhoneCalls.set(id, newCall);
    return newCall;
  }

  async getOpenPhoneCalls(phoneLineId?: number, contactId?: number): Promise<OpenPhoneCall[]> {
    return Array.from(this.openPhoneCalls.values())
      .filter(call => {
        const matchesPhoneLine = phoneLineId ? call.phoneLineId === phoneLineId : true;
        const matchesContact = contactId ? call.contactId === contactId : true;
        return matchesPhoneLine && matchesContact;
      });
  }

  async getOpenPhoneCall(id: number): Promise<OpenPhoneCall | undefined> {
    return this.openPhoneCalls.get(id);
  }

  async getOpenPhoneCallsByDateRange(startDate: Date, endDate: Date, phoneLineId?: number): Promise<OpenPhoneCall[]> {
    return Array.from(this.openPhoneCalls.values())
      .filter(call => {
        const callDate = new Date(call.callDate);
        const matchesDateRange = callDate >= startDate && callDate <= endDate;
        const matchesPhoneLine = phoneLineId ? call.phoneLineId === phoneLineId : true;
        return matchesDateRange && matchesPhoneLine;
      });
  }

  async updateOpenPhoneCall(id: number, updates: Partial<OpenPhoneCall>): Promise<OpenPhoneCall> {
    const existing = this.openPhoneCalls.get(id);
    if (!existing) throw new Error('OpenPhone call not found');

    const updated = { ...existing, ...updates };
    this.openPhoneCalls.set(id, updated);
    return updated;
  }

  // OpenPhone message operations
  async createOpenPhoneMessage(message: InsertOpenPhoneMessage): Promise<OpenPhoneMessage> {
    const id = this.currentIds.openPhoneMessages++;
    const newMessage: OpenPhoneMessage = { ...message, id };
    this.openPhoneMessages.set(id, newMessage);
    return newMessage;
  }

  async getOpenPhoneMessages(phoneLineId?: number, contactId?: number): Promise<OpenPhoneMessage[]> {
    return Array.from(this.openPhoneMessages.values())
      .filter(message => {
        const matchesPhoneLine = phoneLineId ? message.phoneLineId === phoneLineId : true;
        const matchesContact = contactId ? message.contactId === contactId : true;
        return matchesPhoneLine && matchesContact;
      });
  }

  async getOpenPhoneMessage(id: number): Promise<OpenPhoneMessage | undefined> {
    return this.openPhoneMessages.get(id);
  }

  async getOpenPhoneMessagesByDateRange(startDate: Date, endDate: Date, phoneLineId?: number): Promise<OpenPhoneMessage[]> {
    return Array.from(this.openPhoneMessages.values())
      .filter(message => {
        const messageDate = new Date(message.messageDate);
        const matchesDateRange = messageDate >= startDate && messageDate <= endDate;
        const matchesPhoneLine = phoneLineId ? message.phoneLineId === phoneLineId : true;
        return matchesDateRange && matchesPhoneLine;
      });
  }

  async markOpenPhoneMessageAsRead(id: number): Promise<OpenPhoneMessage> {
    const existing = this.openPhoneMessages.get(id);
    if (!existing) throw new Error('OpenPhone message not found');

    const updated = { ...existing, isRead: true };
    this.openPhoneMessages.set(id, updated);
    return updated;
  }

  async updateOpenPhoneMessage(id: number, updates: Partial<OpenPhoneMessage>): Promise<OpenPhoneMessage> {
    const existing = this.openPhoneMessages.get(id);
    if (!existing) throw new Error('OpenPhone message not found');

    const updated = { ...existing, ...updates };
    this.openPhoneMessages.set(id, updated);
    return updated;
  }
  
  // Tenant operations
  async getTenants(): Promise<Tenant[]> {
    return Array.from(this.tenants.values());
  }
  
  async getTenantById(id: number): Promise<Tenant | undefined> {
    return this.tenants.get(id);
  }
  
  async getTenantsByProperty(propertyId: number): Promise<Tenant[]> {
    return Array.from(this.tenants.values())
      .filter(tenant => tenant.propertyId === propertyId);
  }
  
  async getTenantByExternalId(externalId: string, externalSource: string): Promise<Tenant | undefined> {
    return Array.from(this.tenants.values()).find(
      tenant => tenant.externalId === externalId && tenant.externalSource === externalSource
    );
  }
  
  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const id = this.currentIds.tenants++;
    const newTenant: Tenant = { 
      ...tenant, 
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.tenants.set(id, newTenant);
    return newTenant;
  }
  
  async updateTenant(id: number, updates: Partial<Tenant>): Promise<Tenant> {
    const existing = this.tenants.get(id);
    if (!existing) throw new Error('Tenant not found');
    
    const updated = { 
      ...existing, 
      ...updates,
      updatedAt: new Date() 
    };
    this.tenants.set(id, updated);
    return updated;
  }
  
  async deleteTenant(id: number): Promise<boolean> {
    const exists = this.tenants.has(id);
    if (!exists) return false;
    
    this.tenants.delete(id);
    return true;
  }

  // Asset operations
  async getAssets(): Promise<Asset[]> {
    return Array.from(this.assets.values());
  }

  async getAsset(id: number): Promise<Asset | undefined> {
    return this.assets.get(id);
  }

  async getAssetsByProperty(propertyId: number): Promise<Asset[]> {
    return Array.from(this.assets.values())
      .filter(asset => asset.propertyId === propertyId);
  }

  async createAsset(asset: Omit<Asset, "id">): Promise<Asset> {
    // Initialize assets ID in currentIds if it doesn't exist
    if (!this.currentIds.assets) {
      this.currentIds.assets = 1;
    }
    
    const id = this.currentIds.assets++;
    const newAsset: Asset = { ...asset, id };
    this.assets.set(id, newAsset);
    return newAsset;
  }

  async updateAsset(id: number, updates: Partial<Asset>): Promise<Asset> {
    const existing = this.assets.get(id);
    if (!existing) throw new Error('Asset not found');

    const updated = { ...existing, ...updates };
    this.assets.set(id, updated);
    return updated;
  }

  // Static IP Config operations
  async getStaticIpConfig(businessAccountId?: number): Promise<StaticIpConfig | undefined> {
    if (businessAccountId) {
      // If a business account ID is provided, find the config for that specific business
      return Array.from(this.staticIpConfigs.values())
        .find(config => config.businessAccountId === businessAccountId);
    } else {
      // If no business account ID is provided, return the default (global) config
      return Array.from(this.staticIpConfigs.values())
        .find(config => !config.businessAccountId);
    }
  }

  async saveStaticIpConfig(config: Omit<StaticIpConfig, "id" | "createdAt" | "updatedAt">): Promise<StaticIpConfig> {
    // Initialize staticIpConfigs ID in currentIds if it doesn't exist
    if (!this.currentIds.staticIpConfigs) {
      this.currentIds.staticIpConfigs = 1;
    }

    // Check if a config already exists for this business account
    let existingConfig: StaticIpConfig | undefined;
    
    if (config.businessAccountId) {
      existingConfig = Array.from(this.staticIpConfigs.values())
        .find(c => c.businessAccountId === config.businessAccountId);
    } else {
      existingConfig = Array.from(this.staticIpConfigs.values())
        .find(c => !c.businessAccountId);
    }

    if (existingConfig) {
      // Update existing config
      const updatedConfig: StaticIpConfig = {
        ...existingConfig,
        ...config,
        updatedAt: new Date()
      };
      this.staticIpConfigs.set(existingConfig.id, updatedConfig);
      return updatedConfig;
    } else {
      // Create new config
      const id = this.currentIds.staticIpConfigs++;
      const newConfig: StaticIpConfig = {
        ...config,
        id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.staticIpConfigs.set(id, newConfig);
      return newConfig;
    }
  }
}

export const storage = new MemStorage();