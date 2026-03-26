# 📍 Database Location Guide

## **Where is Your Database?**

Your database is hosted in **MongoDB Atlas** (cloud).

---

## ☁️ **Database Location**

### **Type:** MongoDB Atlas (Cloud Database)

**Location:** Cloud-hosted by MongoDB  
**Region:** Auto-selected by Atlas  
**Access:** Internet (anywhere)

**Connection String:**
```
mongodb+srv://<your-username>:<your-password>@<your-cluster-url>/multi_tenant
```

---

## 🔍 **Database Details**

### **Cluster Information:**
```
Cluster Name:    Cluster0
Hostname:        <your-cluster-url>
Database Name:   multi_tenant
Username:        <your-username>
Password:        <your-password>
```

### **Connection Type:**
```
Protocol:        mongodb+srv://
Type:            Cloud (MongoDB Atlas)
Location:        MongoDB's servers
Access:          Internet connection required
```

---

## 📂 **Where to Find Database Info**

### **1. In Your `.env` File**

**File:** `d:/Project 4/multi-tenant-isolation/.env`

**Line 6:**
```env
MONGODB_URI=mongodb+srv://<your-username>:<your-password>@<your-cluster-url>/multi_tenant?retryWrites=true&w=majority&appName=Cluster0
```

---

### **2. MongoDB Atlas Dashboard**

**Access:** https://cloud.mongodb.com/

**Login with your credentials:**
- Email: (your MongoDB account)
- Password: (your MongoDB password)

**Once logged in:**
1. Click on your cluster: **Cluster0**
2. Click "Browse Collections"
3. See your database: **multi_tenant**

---

## 🗄️ **Database Structure**

### **Database Name:** `multi_tenant`

**Collections (Tables):**
```
multi_tenant/
├── projects          ← Your projects
├── users             ← User accounts
├── auditlogs         ← Activity logs
└── (other collections as needed)
```

---

## 🌐 **How to Access Your Database**

### **Option 1: MongoDB Atlas Dashboard (Web)**

**1. Go to:** https://cloud.mongodb.com/

**2. Login** with your MongoDB account

**3. Navigate:**
- Click "Database" in left sidebar
- Click "Browse Collections" on Cluster0
- Select database: `multi_tenant`
- View your data!

**You can:**
- ✅ View all collections
- ✅ See documents (records)
- ✅ Edit data
- ✅ Delete data
- ✅ Run queries
- ✅ Monitor performance

---

### **Option 2: MongoDB Compass (Desktop App)**

**1. Download MongoDB Compass:**
```
https://www.mongodb.com/try/download/compass
```

**2. Install and Open**

**3. Connect with your connection string:**
```
mongodb+srv://<your-username>:<your-password>@<your-cluster-url>/multi_tenant
```

**4. Click "Connect"**

**You can:**
- ✅ Visual interface
- ✅ Browse collections
- ✅ Query data
- ✅ Analyze performance
- ✅ Export data

---

### **Option 3: Command Line (mongosh)**

**1. Install MongoDB Shell:**
```
https://www.mongodb.com/try/download/shell
```

**2. Connect:**
```bash
mongosh "mongodb+srv://<your-username>:<your-password>@<your-cluster-url>/multi_tenant"
```

**3. Run commands:**
```javascript
// Show databases
show dbs

// Use your database
use multi_tenant

// Show collections
show collections

// View projects
db.projects.find()

// View users
db.users.find()

// View audit logs
db.auditlogs.find()
```

---

### **Option 4: Your Application**

**Your app connects automatically!**

**Backend connects on startup:**
```javascript
// File: src/app.js
mongoose.connect(process.env.MONGODB_URI)
```

**Connection string from `.env`:**
```env
MONGODB_URI=mongodb+srv://<your-username>:<your-password>@<your-cluster-url>/multi_tenant
```

---

## 📊 **Current Database Status**

### **Check Connection:**

**1. Backend Health Check:**
```
http://localhost:3000/health/detailed
```

**Response:**
```json
{
  "status": "healthy",
  "dependencies": {
    "mongodb": {
      "status": "healthy",
      "state": "connected",
      "host": "<your-cluster-url>",
      "name": "multi_tenant"
    }
  }
}
```

**2. Backend Logs:**
```
✓ MongoDB connected successfully
✓ Connected to: <your-cluster-url>
✓ Database: multi_tenant
```

---

## 🗺️ **Data Flow**

```
Your App (localhost:5173)
    ↓
Backend API (localhost:3000)
    ↓
MongoDB Atlas (cloud)
    ↓
Cluster: <your-cluster-url>
    ↓
Database: multi_tenant
    ↓
Collections: projects, users, auditlogs
```

---

## 📍 **Physical Location**

### **Where is the data physically?**

**MongoDB Atlas servers:**
- Located in cloud data centers
- Region selected during setup
- Distributed across multiple servers
- Automatic backups
- High availability

**You don't manage the physical location!**
- MongoDB handles infrastructure
- You just use the connection string
- Data is safe and backed up
- Accessible from anywhere

---

## 🔐 **Database Credentials**

### **Connection Details:**

**From `.env` file:**
```env
MONGODB_URI=mongodb+srv://<your-username>:<your-password>@<your-cluster-url>/multi_tenant?retryWrites=true&w=majority&appName=Cluster0
```

**Breakdown:**
```
Protocol:    mongodb+srv://
Username:    <your-username>
Password:    <your-password>
Host:        <your-cluster-url>
Database:    multi_tenant
Options:     retryWrites=true&w=majority&appName=Cluster0
```

---

## 📂 **Local vs Cloud**

### **Your Setup:**

**NOT Local:**
- ❌ No local MongoDB installation
- ❌ No data on your computer
- ❌ No local database files

**Cloud (MongoDB Atlas):**
- ✅ Hosted in the cloud
- ✅ Accessible via internet
- ✅ Managed by MongoDB
- ✅ Automatic backups
- ✅ High availability

---

## 🎯 **Quick Reference**

### **Database Location:**
```
Cloud: MongoDB Atlas
Cluster: <your-cluster-url>
Database: multi_tenant
```

### **Access Methods:**
1. **Web:** https://cloud.mongodb.com/
2. **Desktop:** MongoDB Compass
3. **CLI:** mongosh
4. **App:** Automatic connection

### **Connection String:**
```
mongodb+srv://<your-username>:<your-password>@<your-cluster-url>/multi_tenant
```

### **Collections:**
- `projects` - Your projects
- `users` - User accounts
- `auditlogs` - Activity logs

---

## 🔍 **How to View Your Data**

### **Easiest Way: MongoDB Atlas Dashboard**

**1. Go to:** https://cloud.mongodb.com/

**2. Login**

**3. Click:**
- Database (left sidebar)
- Browse Collections (on Cluster0)
- Select: multi_tenant

**4. You'll see:**
```
multi_tenant
├── projects (0 documents)
├── users (0 documents)
└── auditlogs (0 documents)
```

**5. Click any collection to view data!**

---

## 📊 **Database Info Summary**

| Property | Value |
|----------|-------|
| **Type** | MongoDB Atlas (Cloud) |
| **Cluster** | Cluster0 |
| **Host** | <your-cluster-url> |
| **Database** | multi_tenant |
| **Username** | <your-username> |
| **Location** | Cloud (MongoDB servers) |
| **Access** | Internet connection |
| **Backup** | Automatic |
| **Cost** | Free tier (512 MB) |

---

## 🎯 **Summary**

### **Where is your database?**
**In the cloud (MongoDB Atlas)**

### **How to access it?**
1. **Web:** https://cloud.mongodb.com/
2. **App:** Automatic connection
3. **Compass:** Desktop GUI
4. **CLI:** mongosh

### **Connection string?**
```
mongodb+srv://<your-username>:<your-password>@<your-cluster-url>/multi_tenant
```

### **Database name?**
`multi_tenant`

### **Collections?**
- projects
- users
- auditlogs

---

## 🚀 **Quick Access**

**View Your Data Now:**

1. Open: https://cloud.mongodb.com/
2. Login with your MongoDB account
3. Click "Browse Collections"
4. See your data!

**Or check connection:**
```
http://localhost:3000/health/detailed
```

---

**Your database is in MongoDB Atlas cloud!** ☁️

**Access it at: https://cloud.mongodb.com/** 🌐
