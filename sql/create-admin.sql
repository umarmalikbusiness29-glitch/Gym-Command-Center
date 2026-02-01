-- Admin User Creation SQL Script
-- Run this directly in your PostgreSQL database if Node.js script doesn't work
-- Replace YOUR_HASHED_PASSWORD with an actual hashed password

-- Step 1: Create the user first
INSERT INTO public.users (username, password, role, is_active, created_at)
VALUES (
  'um4779486',
  -- Password: um4779486admin (you can change this)
  -- This is a placeholder - use proper password hashing instead
  'scrypt_hash_here',
  'admin',
  true,
  NOW()
)
ON CONFLICT (username) DO NOTHING;

-- Step 2: Get the user ID
SELECT id FROM public.users WHERE username = 'um4779486';

-- Step 3: Create member profile (replace USER_ID with the ID from step 2)
INSERT INTO public.members (
  user_id,
  full_name,
  email,
  phone,
  gender,
  monthly_fee,
  join_date,
  next_due_date,
  status,
  plan_type,
  created_at
)
VALUES (
  USER_ID,
  'Admin User',
  'um4779486@gmail.com',
  '',
  'other',
  '0',
  NOW(),
  NOW(),
  'active',
  'vip',
  NOW()
)
ON CONFLICT (user_id) DO NOTHING;

-- Verify the user was created
SELECT u.id, u.username, u.role, m.full_name, m.email 
FROM public.users u
LEFT JOIN public.members m ON u.id = m.user_id
WHERE u.username = 'um4779486';
