# UI Mapping Document

## Overview
This document outlines the user interface structure and navigation flows for the Rental Management Portal, focusing on user journeys, component relationships, and interface hierarchies.

## Main Application Structure

### 1. Global Navigation
- **Top Navigation Bar**
  - Logo/Home link
  - User profile dropdown (Settings, Profile, Logout)
  - Notifications bell
  - Global search
  - Help/Support button

- **Side Navigation**
  - Dashboard
  - Properties
  - Tenants
  - Financial
  - Maintenance
  - Integrations
  - Reports
  - Admin settings

### 2. Dashboard View
- **Overview Widgets**
  - Property occupancy rate
  - Financial summary
  - Pending maintenance
  - Recent activity timeline
  - Transaction status
  - Integration health status
  - Quick action buttons (Add property, Add tenant, etc.)

### 3. Properties Section
- **Property List View**
  - Filterable table/grid view of properties
  - Status indicators (Occupied, Vacant, Maintenance)
  - Property thumbnails
  - Search and filter options
  - Sorting capabilities
  - Action buttons (Add, Edit, Delete)

- **Property Detail View**
  - Property images gallery
  - Property information card
    - Address
    - Type
    - Size
    - Amenities
    - Status
  - Financial section (Rent, Income, Expenses)
  - Documents section
  - Maintenance history
  - Tenant information (if occupied)
  - Associated accounts
  - Action buttons (Edit, Schedule maintenance, etc.)

### 4. Financial Management
- **Transactions View**
  - Transaction table with filters
  - Category-based grouping
  - Date range selectors
  - Search functionality
  - Export options
  - Integration status indicators
  - Sync controls

- **Mercury Integration Panel**
  - Connection status
  - Account selection
  - API key management
  - Sync history
  - Transaction mapping settings
  - Static IP configuration
  - Last sync timestamp

- **Wave Integration Panel**
  - Connection status
  - Business selection
  - API token management
  - Accounting data preview
  - Category mapping
  - Sync controls
  - Error logs

- **Reports View**
  - Report type selection
    - Profit & Loss
    - Cash Flow
    - Property Performance
    - Expense Breakdown
    - Income Breakdown
    - Tax Summary
  - Date range selection
  - Property filter
  - Report generation controls
  - Export/Print options

### 5. Integration Hub
- **Connector Marketplace**
  - Available connector cards
  - Installed connector status
  - Search and filter options
  - Configuration wizards
  - Integration health dashboard

- **Static IP Management**
  - Global static IP toggle
  - IP status indicator
  - Current IP address display
  - Business-specific IP assignments
  - IP history log
  - Troubleshooting tools

- **Workflow Builder**
  - Workflow template gallery
  - Visual workflow editor
    - Trigger selection
    - Action configuration
    - Condition definition
  - Workflow execution history
  - Testing tools
  - Schedule configuration

### 6. Admin Settings
- **User Management**
  - User list
  - Role assignment
  - Permission management
  - Invitation system
  - Activity logs

- **Business Account Settings**
  - Business profile information
  - Billing settings
  - API credential management
  - System preferences
  - Data retention policies

## User Journeys

### 1. Property Manager Daily Workflow
```
Login → Dashboard → Check Notifications → View Properties →
Check Financial Status → Handle Maintenance Requests → Generate Reports
```

### 2. Financial Reconciliation Journey
```
Login → Financial Section → Mercury Integration Panel → 
Sync Transactions → Categorize Transactions → Generate P&L Report →
Export for Accounting
```

### 3. Setting Up New Property
```
Login → Properties → Add New Property → 
Enter Property Details → Upload Images → 
Set Financial Details → Save
```

### 4. Connecting External Systems
```
Login → Integrations → Select Provider (Mercury/Wave) → 
Enter API Credentials → Configure Mapping → 
Enable Static IP → Test Connection → Save
```

### 5. Creating Automated Workflow
```
Login → Integrations → Workflow Builder → Create New Workflow →
Select Trigger (New Transaction) → Add Filter Conditions → 
Configure Actions (Categorize, Notify) → Test → Activate
```

## Component Relationships

### 1. Integration Component Flow
```
Static IP Service ←→ Mercury/Wave Connector ←→ Transaction System ←→ Financial Reporting
```

### 2. Property Management Hierarchy
```
Property List → Property Detail → Unit Management → Tenant Information
```

### 3. Financial Data Flow
```
External API Connection → Data Sync → Categorization Engine → Transaction Store → Reporting System
```

## Responsive Design Considerations
- Dashboard layouts adapt to different screen sizes (desktop, tablet, mobile)
- Data tables collapse to card views on smaller screens
- Navigation transforms to hamburger menu on mobile
- Critical actions remain accessible across all device sizes
- Touch-friendly controls for mobile users

## Accessibility Guidelines
- Consistent navigation patterns
- Proper heading hierarchy (H1-H6)
- ARIA attributes for interactive elements
- Sufficient color contrast
- Keyboard navigation support
- Screen reader compatibility
- Focus indicators for interactive elements

## UI Theming
- Primary color: #3B82F6 (Blue)
- Secondary color: #10B981 (Green)
- Neutral colors: #1F2937 (Dark), #F3F4F6 (Light)
- Alert colors: #EF4444 (Red), #F59E0B (Amber), #10B981 (Green)
- Typography: 
  - Headings: Inter (sans-serif)
  - Body: Inter (sans-serif)
- Consistent spacing scale
- Uniform border radius (0.375rem)
- Consistent shadow treatments