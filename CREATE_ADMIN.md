# 🔐 Create Admin User - um4779486@gmail.com

## Method 1: Using Node.js Script (Recommended)

This is the easiest way to create the admin user with proper password hashing.

### Prerequisites
- Backend server running
- Database connected
- Node.js installed

### Steps

**Step 1: Start the backend server**
```bash
cd c:\Users\user\Downloads\Gym-Command-Center\Gym-Command-Center
npm run dev
```

Wait for the message: `Server running on http://localhost:5000`

**Step 2: In a NEW terminal, run the admin creation script**
```bash
npm run create-admin
```

**Step 3: Save the output**
The script will display:
```
✅ Admin user created successfully!

📋 Admin Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Username:  um4779486
📧 Email:     um4779486@gmail.com
🔑 Password:  [GENERATED_PASSWORD]
👑 Role:      Admin
📊 Plan:      VIP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Save the password somewhere safe!**

---

## Method 2: Direct Database (Advanced)

If the Node.js script doesn't work, use direct SQL.

### Prerequisites
- PostgreSQL database connection
- SQL client (pgAdmin, psql, or your provider's console)
- Your DATABASE_URL

### Steps

**Step 1: Connect to your database**

**Supabase:**
- Go to supabase.io > Your Project > SQL Editor
- Click "New Query"

**psql CLI:**
```bash
psql your_connection_string
```

**pgAdmin:**
- Right-click database > Query Tool

**Step 2: Run this SQL**

```sql
-- Get today's date
SELECT NOW();

-- Create admin user (replace the password hash)
INSERT INTO public.users (username, password, role, is_active)
VALUES ('um4779486', 'use_nodejs_script_for_proper_hash', 'admin', true);

-- Verify
SELECT id FROM public.users WHERE username = 'um4779486';
```

**Note:** The password needs to be properly hashed. Use the Node.js script (Method 1) instead!

---

## Method 3: Update Existing Admin

If you want to use the existing admin account instead:

**Username:** `admin`
**Password:** `admin123`
**Email:** `um4779486@gmail.com` (update in database)

---

## ✅ After Creation

### Login with new credentials

1. Go to https://gymnewmaka.web.app
2. Enter:
   - Username: `um4779486`
   - Password: `[your_generated_password]`
3. Click Sign In

### What you can do as Admin

✅ Manage all members
✅ View attendance records
✅ Process payments
✅ Manage store & inventory
✅ Assign workouts & diets
✅ Change gym settings
✅ Edit gym name
✅ Configure pricing

---

## 🆘 Troubleshooting

### "npm run create-admin" doesn't work
- Make sure backend is running: `npm run dev`
- Wait 5 seconds then try again
- Check terminal for errors

### "Cannot connect to database"
- Verify DATABASE_URL is correct
- Check database is running
- Verify firewall rules

### "User already exists"
- The user um4779486 is already in the database
- Use a different username
- Or delete the existing user first

---

## 📝 Database Structure

The script creates:

**Users Table:**
| Column | Value |
|--------|-------|
| username | um4779486 |
| password | [hashed] |
| role | admin |
| is_active | true |

**Members Table:**
| Column | Value |
|--------|-------|
| user_id | [auto] |
| full_name | Admin User |
| email | um4779486@gmail.com |
| plan_type | vip |
| status | active |

---

## 🔒 Security Notes

✅ Passwords are hashed with scrypt
✅ Never store plain passwords
✅ Save your password safely
✅ Change password after first login
✅ Use strong passwords in production

---

Ready? Run: **`npm run create-admin`** 🚀
