# 🔧 Admin Dashboard - Technical Implementation Roadmap

## Current Status: Phase 5 ✅ COMPLETE (Frontend)

All 8 admin pages are fully implemented with:
- ✅ Complete UI/UX
- ✅ Mock data for testing
- ✅ React state management
- ✅ Responsive design
- ✅ PKR currency formatting
- ⏳ Backend API integration (PENDING)

---

## 📋 Frontend Implementation Details

### 1. **Component Architecture**

```
AdminLayout (Layout + Routing)
├── DashboardOverview
├── MenuManagement
├── InventoryManagement
├── OrdersManagement
├── ReportsAnalytics
├── StaffManagement
├── MealPlanManagement
└── Settings

Supporting Components:
├── MetricCard (Reusable dashboard card)
├── CustomTooltip (Recharts tooltip formatter)
└── StatusBadges (Color-coded status indicators)
```

### 2. **State Management**

Currently using **React `useState`** for all components:
- Menu items state: `[items, setItems]`
- Inventory state: `[inventory, setInventory]`
- Staff state: `[staff, setStaff]`
- Students state: `[students, setStudents]`
- Modal visibility: `[showModal, setShowModal]`
- Form data: `[formData, setFormData]`

**Future Enhancement:** Migrate to Redux/Context API for:
- Global state persistence
- Real-time updates via Socket.io
- Cross-component data sharing

### 3. **Routing Structure**

```
/admin
├── /dashboard        → DashboardOverview
├── /menu            → MenuManagement
├── /inventory       → InventoryManagement
├── /orders          → OrdersManagement
├── /reports         → ReportsAnalytics
├── /staff           → StaffManagement
├── /meal-plans      → MealPlanManagement
└── /settings        → Settings
```

Protected by ProtectedRoute wrapper checking `user.role === 'admin'`

### 4. **Data Format Specifications**

**Menu Item Object:**
```javascript
{
  id: 1,
  name: 'Chicken Biryani',
  category: 'Lunch',
  price: 240,           // PKR
  tags: ['H', 'GF'],    // Dietary
  available: true,
  special: false,
  description: 'Text',
  image: 'URL'
}
```

**Inventory Item Object:**
```javascript
{
  id: 1,
  name: 'Atta (Flour)',
  stock: 45,
  unit: 'kg',
  threshold: 20,
  status: 'OK',         // OK/LOW/CRITICAL
  lastUpdated: 'ISO string'
}
```

**Staff Member Object:**
```javascript
{
  id: 1,
  name: 'Ahmed Khan',
  email: 'ahmed@cafe.pk',
  role: 'Cashier',      // Cashier/Kitchen/Manager/Admin
  status: 'Active',
  lastLogin: '2 hours ago',
  joinDate: '2024-01-15'
}
```

**Student Meal Plan Object:**
```javascript
{
  id: 1,
  name: 'Ali Ahmed',
  email: 'ali@uni.edu.pk',
  plan: 'Monthly',      // Daily/Weekly/Monthly/Semester
  credits: 5000,        // PKR
  expiryDate: '2024-02-15',
  status: 'Active'      // Active/Expiring Soon/Expired
}
```

**Order Object:**
```javascript
{
  id: 'ORD-001',
  customer: 'Student 1',
  items: ['Item1', 'Item2'],
  total: 280,
  status: 'Completed',  // Pending/In Progress/Completed/Cancelled
  paymentMethod: 'Cash',
  time: '2024-01-23 12:30 PM'
}
```

---

## 🚀 Backend Integration Requirements

### API Endpoints Needed

#### **Menu Management**
```
GET    /api/admin/menu-items              → Fetch all items
POST   /api/admin/menu-items              → Create item
PUT    /api/admin/menu-items/:id          → Update item
DELETE /api/admin/menu-items/:id          → Delete item
PATCH  /api/admin/menu-items/:id/toggle   → Toggle availability
PATCH  /api/admin/menu-items/:id/special  → Mark as special
```

#### **Inventory Management**
```
GET    /api/admin/inventory               → Fetch all items
POST   /api/admin/inventory               → Add inventory item
PUT    /api/admin/inventory/:id           → Update inventory
DELETE /api/admin/inventory/:id           → Delete inventory item
GET    /api/admin/inventory/alerts        → Get low/critical items
```

#### **Orders Management**
```
GET    /api/admin/orders                  → Fetch all orders
GET    /api/admin/orders/:id              → Get order details
PATCH  /api/admin/orders/:id/status       → Update order status
```

#### **Reports & Analytics**
```
GET    /api/admin/reports/sales?from=&to= → Sales data for date range
GET    /api/admin/reports/top-items?limit=10
GET    /api/admin/reports/revenue-by-category
GET    /api/admin/reports/staff-performance
```

#### **Staff Management**
```
GET    /api/admin/staff                   → Fetch all staff
POST   /api/admin/staff                   → Add staff member
PUT    /api/admin/staff/:id               → Update staff
DELETE /api/admin/staff/:id               → Delete staff
PATCH  /api/admin/staff/:id/status        → Toggle status
```

#### **Meal Plans**
```
GET    /api/admin/meal-plans              → Fetch all plans
GET    /api/admin/meal-plans/:studentId   → Get student plan
PUT    /api/admin/meal-plans/:studentId   → Update plan
POST   /api/admin/meal-plans/:studentId/credits → Add credits
GET    /api/admin/meal-plans/:studentId/transactions → History
POST   /api/admin/meal-plans/bulk-reset   → Semester reset
```

---

## 📊 Recharts Implementation

All 4 chart types are fully implemented:

### 1. **Bar Chart (Hourly Sales)**
- Component: `<BarChart>`
- Data: Hourly revenue in PKR
- Tooltip: Formats values as currency
- Used in: DashboardOverview, ReportsAnalytics

### 2. **Pie Chart (Payment Methods, Revenue by Category)**
- Component: `<PieChart>`
- Data: Donut-style with inner/outer radius
- Legend: Shows breakdown by category
- Used in: DashboardOverview, ReportsAnalytics

### 3. **Line Chart (Weekly Revenue)**
- Component: `<LineChart>`
- Data: Daily revenue trend
- Dots: Clickable/interactive points
- Used in: DashboardOverview, ReportsAnalytics

### 4. **Horizontal Bar Chart (Top Items)**
- Component: `<BarChart layout="vertical">`
- Data: Item names as categories, revenue as values
- Used in: DashboardOverview, ReportsAnalytics

**Custom Tooltip:**
```javascript
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg border border-forest/20">
        <p>{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};
```

---

## 🔄 State Flow (Future with Backend)

### Example: Add Menu Item Flow

1. **User Action**
   ```
   Click "Add Item" button
   → Opens modal form
   ```

2. **Form Submission**
   ```
   User fills form + clicks Save
   → Validates data
   → Calls POST /api/admin/menu-items
   ```

3. **API Call (Axios)**
   ```javascript
   // In handleSaveItem()
   try {
     const response = await api.post('/admin/menu-items', {
       name: formData.name,
       category: formData.category,
       price: formData.price,
       tags: formData.tags,
       available: formData.available
     });
     
     // Update local state from response
     setItems([...items, response.data.item]);
     showToast('Item added successfully');
   } catch (error) {
     showToast(error.message);
   }
   ```

4. **UI Update**
   ```
   Modal closes
   → Table refreshes with new item
   → Success toast appears
   ```

---

## 🔌 Real-Time Updates (Socket.io)

### Current Setup (To be implemented)

**Dashboard Live Updates:**
```javascript
// Listen for new orders
socket.on('new_order', () => {
  loadDashboardData();  // Refresh metrics
  showNotification('New order received!');
});

// Listen for inventory alerts
socket.on('low_stock_alert', (item) => {
  showNotification(`${item.name} is now low in stock`);
});

// Listen for order status changes
socket.on('order_status_changed', (order) => {
  updateOrderInTable(order);
});
```

---

## 📦 Dependencies Already Installed

```json
{
  "react": "^18.x",
  "react-router-dom": "^6.x",
  "recharts": "^2.x",
  "lucide-react": "^0.x",
  "tailwindcss": "^3.x",
  "axios": "^1.x",
  "socket.io-client": "^4.x"
}
```

---

## 🧪 Testing Checklist

- [ ] All 8 pages load without errors
- [ ] Navigation works between pages
- [ ] Forms submit and update state
- [ ] Search/filter functionality works
- [ ] Modals open/close properly
- [ ] Charts render with mock data
- [ ] Responsive design on mobile (320px+)
- [ ] PKR currency formatting correct
- [ ] Color scheme matches design (Forest #1B4332, Orange #E76F00)
- [ ] Accessibility (keyboard nav, ARIA labels)

---

## 🔐 Security Considerations

1. **Admin-Only Access**
   - ProtectedRoute wrapper enforces role check
   - Backend should validate `Authorization: Bearer token`
   - Token should contain `role: 'admin'`

2. **Input Validation**
   - Client-side: Required fields, data types
   - Server-side: Whitelist fields, escape/sanitize
   - Example: Price must be number > 0

3. **CORS & Headers**
   - Backend should set CORS headers
   - Frontend uses credentials: 'include' for cookies

4. **Audit Logging**
   - Track all admin actions (Create/Update/Delete)
   - Log: User ID, Action, Timestamp, Old/New Values
   - Future feature

---

## 📝 Mock Data Locations

All mock data is hardcoded in each component:

| Component | Mock Data Variable | Count |
|-----------|-------------------|-------|
| DashboardOverview | HOURLY_SALES, TOP_ITEMS, etc | 4 datasets |
| MenuManagement | MOCK_MENU_ITEMS | 5 items |
| InventoryManagement | MOCK_INVENTORY | 10 items |
| OrdersManagement | MOCK_ORDERS | 5 orders |
| ReportsAnalytics | REVENUE_BY_CATEGORY, etc | 4 datasets |
| StaffManagement | MOCK_STAFF | 6 staff |
| MealPlanManagement | MOCK_STUDENTS | 5 students |

**To integrate real data:** Replace `useState(MOCK_DATA)` with API calls in `useEffect()`

---

## 🚢 Deployment Checklist

- [ ] Replace mock data with API calls
- [ ] Implement error boundaries
- [ ] Add loading spinners
- [ ] Set up error logging (Sentry, LogRocket)
- [ ] Configure environment variables (API_URL, etc)
- [ ] Test with production data
- [ ] Performance optimization (lazy loading, memoization)
- [ ] Set up analytics tracking
- [ ] Create admin onboarding guide
- [ ] Set up backup/restore procedures

---

## 📞 Developer Notes

### File Organization
- All page components in `components/admin/pages/`
- Layout component in `components/admin/AdminLayout.jsx`
- Page wrappers in `pages/admin/` (thin wrappers)
- Routing configured in `App.jsx`

### Naming Conventions
- Components: PascalCase (MenuManagement.jsx)
- Functions: camelCase (handleSaveItem)
- Constants: UPPER_SNAKE_CASE (MOCK_DATA)
- CSS classes: Tailwind utility + custom classes

### Code Style
- Functional components with Hooks
- JSX formatting: Props on separate lines
- Comments for complex logic
- Destructuring preferred over dot notation

### Common Patterns
```javascript
// Fetch data on mount
useEffect(() => {
  loadData();
}, []);

// Modal handling
const handleOpenModal = (item = null) => { ... };

// CRUD operations
const handleSaveItem = () => { ... };
const handleDeleteItem = (id) => { ... };

// Search/Filter
const filtered = data.filter(item => 
  item.name.toLowerCase().includes(search.toLowerCase())
);
```

---

## 🎯 Next Phase: Backend Integration

Once backend APIs are ready:

1. Replace `MOCK_*` constants with `useEffect` + `api.get()`
2. Update `handleSave*` functions to call API endpoints
3. Add loading states and error handling
4. Implement Socket.io listeners for real-time updates
5. Add authentication token refresh logic
6. Implement pagination for large datasets
7. Add data validation and error messages
8. Set up environment-specific API URLs

**Estimated effort:** 2-3 weeks for full backend integration + testing

---

**Created:** January 2024
**Last Updated:** January 2024
**Status:** Phase 5 Frontend Complete ✅
