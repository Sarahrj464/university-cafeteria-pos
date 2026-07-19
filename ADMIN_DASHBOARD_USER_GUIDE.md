# 🍽️ Admin Dashboard - User Guide

## 📍 How to Access the Admin Dashboard

1. **Login as Admin**
   - Go to `/login` (or root `/`)
   - Enter admin credentials
   - You'll be automatically redirected to `/admin/dashboard`

2. **Admin Sidebar Navigation**
   - Located on the left side (desktop) or accessible via menu (mobile)
   - 8 main sections for managing the cafeteria

---

## 📊 1. Dashboard Overview

**URL:** `/admin/dashboard`

### What You See:

#### Top Metrics (4 Cards)
- **Today Revenue** - Total PKR earned today with trend ↑12%
- **Orders Today** - Number of orders processed
- **Active Orders** - Live queue with pulsing indicator
- **Low Stock Items** - Alert for inventory below threshold

#### Charts (4 Interactive Visualizations)

**Hourly Sales Bar Chart**
- Time range: 7 AM - 9 PM
- Y-axis: Revenue in PKR
- Shows: Peak hours, customer flow patterns
- Example: 1 PM peak = PKR 98,000 revenue

**Weekly Revenue Line Chart**
- X-axis: Mon-Sun
- Y-axis: Daily revenue (PKR)
- Trend: Shows weekly patterns
- Example: Friday highest (PKR 310,000 due to weekend rush)

**Payment Methods Pie Chart**
- Breakdown of payment types:
  - Cash
  - Card/QR
  - Meal Plan (largest slice)
  - Campus Wallet
- Shows customer payment preferences

**Top 10 Items Horizontal Bar Chart**
- Shows highest revenue-generating items
- Top: Chicken Biryani (PKR 28,000)
- Helps identify bestsellers

#### Live Order Feed
- Last 10 orders table
- Columns: Order ID, Customer, Items, Total (PKR), Status, Time
- Status colors:
  - 🟢 Green = Completed
  - 🟡 Yellow = In Progress
  - ⚪ Gray = Pending

---

## 🍽️ 2. Menu Management

**URL:** `/admin/menu`

### Features:

**Search & Filter**
- Search by item name (e.g., "Biryani", "Chai")
- Filter by category:
  - Breakfast (11 items)
  - Lunch (13 items)
  - Dinner (8 items)
  - Snacks (17 items)
  - Beverages (13 items)
  - Desserts (6 items)
  - Confectionery (6 items)

**Table Display**
- Item Name (with ⭐ for special items)
- Category
- Price (PKR) - orange text
- Dietary Tags: V, VE, H, GF
- Availability: Yes/No
- Actions: Edit, Delete

**Add/Edit Modal Form**
- **Item Name** - Required
- **Category** - Dropdown (7 options)
- **Price (PKR)** - Required
- **Description** - Optional
- **Dietary Tags** - Checkboxes:
  - V = Vegetarian
  - VE = Vegan
  - H = Halal
  - GF = Gluten-Free
- **Available** - Toggle switch
- Save or Cancel buttons

### Examples:
- Chicken Biryani: Category=Lunch, Price=240 PKR, Tags=[H, GF], Available=Yes
- Aloo Paratha: Category=Breakfast, Price=50 PKR, Tags=[V], Special=Yes

---

## 📦 3. Inventory Management

**URL:** `/admin/inventory`

### Stock Status Dashboard
- 🟢 Items in Stock: Count + green card
- 🔴 Critical Items: Count + red alert
- 🟡 Low Stock: Count + yellow warning

### Inventory Table
**Columns:**
- Ingredient Name
- Current Stock (numeric)
- Unit (kg, L, pieces)
- Reorder Threshold
- Status (OK/LOW/CRITICAL)
- Last Updated (timestamp)
- Actions (Edit/Delete)

### Pakistani Items Tracked:
1. **Atta (Flour)** - 45kg (Status: OK)
2. **Chicken (Boneless)** - 8kg (Status: LOW) ⚠️
3. **Basmati Rice** - 32kg (Status: OK)
4. **Daal (Lentils)** - 2kg (Status: CRITICAL) 🔴
5. **Cooking Oil** - 7L (Status: OK)
6. **Chai Patti (Tea Leaves)** - 3.5kg (Status: LOW) ⚠️
7. **Sugar** - 18kg (Status: OK)
8. **Bread (Fresh)** - 50 pieces (Status: OK)
9. **Butter** - 1.5kg (Status: LOW) ⚠️
10. **Onions** - 25kg (Status: OK)

### Add/Edit Item Modal
- Item Name
- Current Stock (number)
- Unit (kg, L, Pieces, Dozen)
- Reorder Threshold (triggers LOW/CRITICAL)

**Status Logic:**
- Stock ≤ Threshold × 0.3 = CRITICAL 🔴
- Stock ≤ Threshold = LOW 🟡
- Stock > Threshold = OK 🟢

---

## 🎯 4. Orders Management

**URL:** `/admin/orders`

### Summary Cards
- **Pending Orders** - Awaiting confirmation
- **In Progress** - Being prepared/processed
- **Completed Orders** - Ready/delivered
- **Total Revenue** - Combined PKR value

### Orders Table
**Columns:**
- Order ID (ORD-001, ORD-002, etc.)
- Customer Name
- Items Count
- Total (PKR, orange text)
- Payment Method (Cash, Card, Meal Plan, QR)
- Status (color-coded badges)
- Time Placed
- View Details button (eye icon)

### Status Indicators
- 🟢 Green = Completed
- 🟡 Yellow = In Progress
- 🔵 Blue = Pending
- 🔴 Red = Cancelled

### Order Details Modal
Click "View" to see:
- Full customer name
- Complete item list
- Total amount (PKR)
- Payment method
- Status
- Order timestamp

---

## 📈 5. Reports & Analytics

**URL:** `/admin/reports`

### Date Range Selector
- **Today** - Current day only
- **This Week** - Mon-Sun
- **This Month** - Full calendar month
- **Custom** - Pick from/to dates

### Key Metrics (3 Cards)
- **Total Revenue** - All-time or selected period (PKR)
- **Total Orders** - Number of orders
- **Average Order Value** - PKR calculation

### Visualizations

**Revenue by Category Pie Chart**
- Breakdown by meal category
- Largest slices:
  - Lunch (PKR 680,000) - 40%
  - Breakfast (PKR 380,000) - 23%
  - Snacks (PKR 420,000) - 25%
  - Beverages (PKR 280,000) - 16%
  - Desserts (PKR 155,000) - 9%

**Daily Sales Trend Line Chart**
- Revenue progression day-by-day
- Helps identify sales patterns

**Top Items by Revenue**
- Horizontal bar chart
- Top 5: Chicken Biryani, Karahi, Biryani, Kebab, Daal Chawal

### Staff Performance Table
- Staff Member Name (Role in parentheses)
- Total Sales (PKR)
- Orders Processed (count)
- Accuracy Rate (%) - Quality metric

**Example:**
- Ahmed (Cashier 1): PKR 285,000 | 950 orders | 99% accuracy

### Export Options
- **CSV Export** - Green button, opens download
- **PDF Export** - Red button, formatted report

---

## 👥 6. Staff Management

**URL:** `/admin/staff`

### Staff Statistics
- **Active Staff** - Count of current employees
- **Cashiers** - Count by role
- **Kitchen Staff** - Count by role

### Staff Directory Table
**Columns:**
- Staff Name
- Email Address
- Role Badge (Cashier/Kitchen/Manager/Admin)
- Status (Active/Inactive)
- Last Login (timestamp)
- Actions (Edit, Disable/Enable, Delete)

### Add/Edit Staff Modal
- Full Name - Required
- Email Address - Required
- Role Dropdown:
  - Cashier (most common)
  - Kitchen (food prep)
  - Manager (admin staff)
  - Admin (full system access)
- Status: Active/Inactive

### Staff Actions
- **Edit** - Update details, role, status
- **Disable/Enable** - Toggle access without deleting
- **Delete** - Permanently remove from system

---

## 💳 7. Meal Plan Management

**URL:** `/admin/meal-plans`

### Meal Plan Statistics (4 Cards)
- **Active Plans** - 5 students with valid plans
- **Expiring Soon** - Plans expiring within 7 days
- **Expired Plans** - Overdue plans
- **Total Credits** - Sum of all student credits (PKR)

### Student Meal Plans Table
**Columns:**
- Student Name
- Email Address
- Plan Type (Daily/Weekly/Monthly/Semester)
- Credits Balance (PKR)
- Plan Expiry Date
- Status (Active/Expiring Soon/Expired)
- Actions (Edit, Add Credits)

### Edit Meal Plan Modal
- Student: [Name]
- Plan Type Dropdown:
  - Daily (PKR 500)
  - Weekly (PKR 3,000)
  - Monthly (PKR 10,000)
  - Semester (PKR 40,000)
- Current Credits display
- Save Changes button

### Add Credits Modal
- Student: [Name]
- Amount to Add (PKR) - Required
- Shows new balance calculation
- Example: Current 5,000 + Add 2,000 = New 7,000 PKR

### Transaction History
- Tracks all credit additions
- Shows: Date, Amount, Type (Recharged/Spent)

### Bulk Operations
- **Bulk Semester Reset** - Updates all students at semester start
  - Sets plan to Semester (PKR 40,000)
  - Sets expiry to 2024-06-30
  - Resets all credits to 40,000 PKR
  - Confirmation required (cannot undo)

---

## ⚙️ 8. Settings

**URL:** `/admin/settings`

### General Settings
- **Cafeteria Name** - Display name (default: "QuickByte Café")
- **Currency** - Default PKR (selectable: PKR, USD, EUR)
- **Timezone** - Default Asia/Karachi
- **Operating Hours** - Display hours (e.g., "7:00 AM - 9:00 PM")

### Notification Settings
- ✓ **Enable Order Notifications** - Alert when order placed/ready
- ✓ **Enable Stock Alerts** - Alert when items low/critical
- ✓ **Send Daily Reports** - Email summary each day

### Data Management
- **Backup Frequency** - Hourly/Daily/Weekly/Monthly
- **Manual Backup** - Create backup immediately
- **Restore** - Restore from previous backup

### Security
- **Change Admin Password** - Reset admin account password

### Save Settings
- **Save All Settings** button at bottom
- Confirmation message on success
- Auto-hides after 3 seconds

---

## 🎨 Visual Design Elements

### Color Scheme
- 🟢 **Green (#22c55e)** - Active, OK, Success
- 🔴 **Red (#ef4444)** - Critical, Danger, Delete
- 🟡 **Amber/Yellow** - Warning, Expiring Soon, Low Stock
- 🔵 **Blue (#3b82f6)** - Info, Pending, Edit
- 🟠 **Orange (#e76f00)** - Primary action, Accent, Prices
- 🟤 **Forest Green (#1B4332)** - Brand color, Headers, Primary buttons

### UI Patterns
- **Cards**: White background, subtle shadow, left border accent
- **Badges**: Rounded pills with color-coded text
- **Tables**: Striped rows, hover highlighting, responsive
- **Modals**: Overlay with form fields, close button
- **Buttons**: Rounded corners, hover effects, icon + text
- **Charts**: Responsive containers, interactive tooltips

---

## 📱 Mobile Experience

- **Responsive Grid**: Columns adapt (1 col mobile → 4 col desktop)
- **Scrollable Tables**: Horizontal scroll on small screens
- **Touch-Friendly**: Larger tap targets, better spacing
- **Stacked Forms**: Inputs full-width on mobile
- **Sidebar**: Hamburger menu icon, overlay navigation

---

## 🔐 Admin-Only Access

- All `/admin/*` routes require admin role
- Non-admin users redirected to `/unauthorized`
- Session timeout requires re-login
- Audit logs track admin actions (future feature)

---

## 💡 Tips & Tricks

1. **Quick Add Item**: Click "Add Item" button on Menu page for fast menu entry
2. **Bulk Import**: Copy/paste inventory from spreadsheet (future feature)
3. **Report Export**: Download reports for presentations or email
4. **Real-time Updates**: Dashboard refreshes automatically as orders come in
5. **Search Everywhere**: Use search bars to quickly find items/students/staff
6. **Status Indicators**: Learn color meanings for quick scanning

---

## 📞 Support

For issues or feature requests related to the admin dashboard, contact the development team.

**Last Updated:** January 2024
**Version:** Phase 5 - Complete
