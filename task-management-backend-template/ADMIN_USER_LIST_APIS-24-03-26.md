# ✅ Admin User List & Management APIs

**Date:** 24-03-26  
**Status:** ✅ COMPLETE  
**Figma:** `main-admin-dashboard/user-list-flow.png`

---

## 📋 Overview

Complete API implementation for **Admin User Management** with:
- **Pagination** with configurable page size
- **Search** by username or email
- **Filter** by user role
- **Date range** filtering
- **User registration chart** (monthly/yearly)

---

## 🔌 API Endpoints

### **1. Get All Users (Paginated)**
```
GET /users/admin/all-users
```

**Query Parameters:**
- `search` (optional): Search by username or email
- `role` (optional): Filter by role (`individual` | `child` | `business` | `admin` | `all`)
- `from` (optional): Start date (ISO format)
- `to` (optional): End date (ISO format)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `sortBy` (optional): Sort field (default: `-createdAt`)

---

### **2. Get User Registration Count for Chart**
```
GET /users/admin/user-registration-count?type=monthly|yearly
```

**Query Parameters:**
- `type` (optional): `'monthly'` or `'yearly'` (default: `'monthly'`)

---

## 📊 Response Examples

### **1️⃣ GET /users/admin/all-users**

**Request:**
```bash
GET /users/admin/all-users?role=all&page=1&limit=20&sortBy=-createdAt
```

**Response:**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "docs": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "individual",
        "phoneNumber": "+1234567890",
        "profileId": {
          "_id": "507f191e810c19729de860ea",
          "location": "New York, USA",
          "phoneNumber": "+1234567890"
        },
        "createdAt": "2026-03-12T09:30:00.000Z",
        "isDeleted": false
      },
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "role": "business",
        "phoneNumber": "+1234567891",
        "profileId": {
          "_id": "507f191e810c19729de860eb",
          "location": "London, UK",
          "phoneNumber": "+1234567891"
        },
        "createdAt": "2026-03-11T14:20:00.000Z",
        "isDeleted": false
      }
    ],
    "page": 1,
    "limit": 20,
    "total": 2543,
    "totalPages": 128
  },
  "message": "Users retrieved successfully for admin dashboard"
}
```

---

### **2️⃣ GET /users/admin/user-registration-count?type=monthly**

**Request:**
```bash
GET /users/admin/user-registration-count?type=monthly
```

**Response (Monthly):**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "type": "monthly",
    "data": [
      { "period": "1", "label": "Jan", "count": 180 },
      { "period": "2", "label": "Feb", "count": 210 },
      { "period": "3", "label": "Mar", "count": 250 },
      { "period": "4", "label": "Apr", "count": 195 },
      { "period": "5", "label": "May", "count": 220 },
      { "period": "6", "label": "Jun", "count": 240 },
      { "period": "7", "label": "Jul", "count": 185 },
      { "period": "8", "label": "Aug", "count": 200 },
      { "period": "9", "label": "Sep", "count": 230 },
      { "period": "10", "label": "Oct", "count": 260 },
      { "period": "11", "label": "Nov", "count": 190 },
      { "period": "12", "label": "Dec", "count": 183 }
    ],
    "totalUsers": 2543,
    "growthRate": 18.42
  },
  "message": "User registration count retrieved successfully"
}
```

---

**Response (Yearly):**
```bash
GET /users/admin/user-registration-count?type=yearly
```

```json
{
  "success": true,
  "code": 200,
  "data": {
    "type": "yearly",
    "data": [
      { "period": "2022", "label": "2022", "count": 1200 },
      { "period": "2023", "label": "2023", "count": 1800 },
      { "period": "2024", "label": "2024", "count": 2543 }
    ],
    "totalUsers": 5543,
    "growthRate": 41.28
  },
  "message": "User registration count retrieved successfully"
}
```

---

## 🎨 Frontend Integration

### **React Component Example:**

```typescript
// AdminUserList.tsx
const AdminUserList = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [dateRange, setDateRange] = useState<{from?: string; to?: string}>({});
  const [chartType, setChartType] = useState<'monthly' | 'yearly'>('monthly');
  const [chartData, setChartData] = useState<any>(null);

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      role,
      sortBy: '-createdAt',
    });

    if (search) params.append('search', search);
    if (dateRange.from) params.append('from', dateRange.from);
    if (dateRange.to) params.append('to', dateRange.to);

    const response = await api.get(`/users/admin/all-users?${params}`);
    setUsers(response.data.data);
    setLoading(false);
  };

  // Fetch chart data
  const fetchChartData = async () => {
    const response = await api.get(`/users/admin/user-registration-count?type=${chartType}`);
    setChartData(response.data.data);
  };

  useEffect(() => {
    fetchUsers();
  }, [page, limit, role, search, dateRange]);

  useEffect(() => {
    fetchChartData();
  }, [chartType]);

  return (
    <div>
      {/* User Ratio Chart */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">User Ratio</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setChartType('monthly')}
              className={`px-4 py-2 rounded ${
                chartType === 'monthly' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setChartType('yearly')}
              className={`px-4 py-2 rounded ${
                chartType === 'yearly' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              Annually
            </button>
          </div>
        </div>
        
        <BarChart
          data={chartData?.data.map(d => ({
            label: d.label,
            value: d.count,
          }))}
          height={300}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        {/* Role Filter */}
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border rounded-lg px-4 py-2"
        >
          <option value="all">All Users</option>
          <option value="individual">Individual</option>
          <option value="child">Child</option>
          <option value="business">Business</option>
          <option value="admin">Admin</option>
        </select>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-4 py-2 flex-1"
        />

        {/* Date Range */}
        <DatePicker
          range
          value={dateRange}
          onChange={setDateRange}
          placeholder="Select date range"
        />
      </div>

      {/* User Table */}
      <table className="w-full">
        <thead>
          <tr>
            <th>No</th>
            <th>User Name</th>
            <th>Email</th>
            <th>Phone Number</th>
            <th>Address</th>
            <th>User Type</th>
            <th>Joining Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.docs?.map((user, index) => (
            <tr key={user._id} className="border-t">
              <td>{String(index + 1).padStart(2, '0')}</td>
              <td>
                <div className="flex items-center gap-2">
                  <Avatar src={user.profileImage} />
                  <span>{user.name}</span>
                </div>
              </td>
              <td>{user.email}</td>
              <td>{user.profileId?.phoneNumber || 'N/A'}</td>
              <td>{user.profileId?.location || 'N/A'}</td>
              <td>
                <Badge>{user.role}</Badge>
              </td>
              <td>
                {new Date(user.createdAt).toLocaleDateString()}
                <br />
                <small>{new Date(user.createdAt).toLocaleTimeString()}</small>
              </td>
              <td>
                <button className="text-blue-500 hover:underline">
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={users.totalPages}
        onPageChange={setPage}
        limit={limit}
        onLimitChange={setLimit}
      />
    </div>
  );
};
```

---

## 📊 Chart.js Integration

### **User Registration Chart:**

```typescript
const chartConfig = {
  type: 'bar' as const,
  data: {
    labels: chartData?.data.map(d => d.label) || [],
    datasets: [{
      label: 'New Users',
      data: chartData?.data.map(d => d.count) || [],
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1,
      borderRadius: 4,
    }],
  },
  options: {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.raw} users`,
          title: (context: any) => {
            const item = context[0];
            const growthRate = chartData?.growthRate;
            return `${item.label} (${growthRate}% growth)`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
      },
    },
  },
};
```

---

## 🧪 Testing

### **Test Case 1: Get All Users (Default)**

```bash
curl -X GET "http://localhost:5000/api/v1/users/admin/all-users?page=1&limit=20" \
  -H "Authorization: Bearer <admin_jwt_token>"
```

---

### **Test Case 2: Search by Name**

```bash
curl -X GET "http://localhost:5000/api/v1/users/admin/all-users?search=john" \
  -H "Authorization: Bearer <admin_jwt_token>"
```

---

### **Test Case 3: Filter by Role**

```bash
curl -X GET "http://localhost:5000/api/v1/users/admin/all-users?role=business" \
  -H "Authorization: Bearer <admin_jwt_token>"
```

---

### **Test Case 4: Date Range Filter**

```bash
curl -X GET "http://localhost:5000/api/v1/users/admin/all-users?from=2026-01-01&to=2026-03-24" \
  -H "Authorization: Bearer <admin_jwt_token>"
```

---

### **Test Case 5: Get Monthly User Registration Chart**

```bash
curl -X GET "http://localhost:5000/api/v1/users/admin/user-registration-count?type=monthly" \
  -H "Authorization: Bearer <admin_jwt_token>"
```

---

### **Test Case 6: Get Yearly User Registration Chart**

```bash
curl -X GET "http://localhost:5000/api/v1/users/admin/user-registration-count?type=yearly" \
  -H "Authorization: Bearer <admin_jwt_token>"
```

---

## 📁 Files Modified

| File | Changes |
|------|---------|
| `user.service.ts` | Added `getAllUsersForAdminDashboard()` and `getUserRegistrationCountForChart()` |
| `user.controller.ts` | Added controller methods |
| `user.route.ts` | Added `/admin/all-users` and `/admin/user-registration-count` routes |

---

## ✅ Complete Feature List

### **User List:**
- ✅ Pagination (configurable page size)
- ✅ Search by username or email
- ✅ Filter by role (individual, child, business, admin, all)
- ✅ Date range filtering
- ✅ Sorting (default: newest first)
- ✅ Populated profile data (location, phone)

### **User Registration Chart:**
- ✅ Monthly view (current year, 12 months)
- ✅ Yearly view (last 5 years)
- ✅ Growth rate calculation
- ✅ Total users count
- ✅ Chart-ready data format

---

## 🎯 Query Parameter Examples

### **Combined Filters:**
```bash
# Search for business users who joined in March 2026
GET /users/admin/all-users?role=business&search=business&from=2026-03-01&to=2026-03-31&page=1&limit=10

# Get all child users sorted by name
GET /users/admin/all-users?role=child&sortBy=name&page=1&limit=50

# Search by email domain
GET /users/admin/all-users?search=@gmail.com&role=all
```

---

## 📊 Response Data Structure

### **User List Response:**
```typescript
{
  docs: Array<{
    _id: string;
    name: string;
    email: string;
    role: string;
    phoneNumber?: string;
    profileId?: {
      location?: string;
      phoneNumber?: string;
    };
    createdAt: Date;
    isDeleted: boolean;
  }>;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

### **Chart Data Response:**
```typescript
{
  type: 'monthly' | 'yearly';
  data: Array<{
    period: string;
    label: string;
    count: number;
  }>;
  totalUsers: number;
  growthRate: number;
}
```

---

## ✅ Summary

### **What Was Implemented:**

1. ✅ **User List with Pagination**
   - Search by username or email
   - Filter by role
   - Date range filtering
   - Configurable sorting
   - Profile data population

2. ✅ **User Registration Chart**
   - Monthly view (12 months)
   - Yearly view (5 years)
   - Growth rate calculation
   - Chart-ready data format

### **Benefits:**

- ✅ **Single endpoint** for user management
- ✅ **Flexible filtering** options
- ✅ **Chart-ready data** for visualization
- ✅ **Pagination** for large datasets
- ✅ **Search** across multiple fields

---

**All admin user management APIs are production-ready!** 🎉
