# Supabase Setup Guide for Avadh Connect

## Quick Setup Instructions

### 1. Run the SQL Setup

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project: `qphgtdehhihobjfaaula`
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the entire contents of `supabase-setup.sql`
6. Click **Run** or press `Ctrl+Enter`

### 2. Verify Tables Created

After running the SQL, verify the following tables exist:
- ✅ `users`
- ✅ `categories`
- ✅ `businesses`
- ✅ `products`

You can check in **Table Editor** (left sidebar).

### 3. Verify Storage Bucket

1. Go to **Storage** (left sidebar)
2. Verify the `images` bucket exists
3. It should be marked as **Public**


## Database Schema Overview

### Users Table
- **Purpose**: Store user accounts (normal and business)
- **Key Fields**: 
  - `id` (UUID, matches auth.users)
  - `account_type` ('normal' or 'business')
  - `role` ('user')
  - `is_approved` (boolean)

### Categories Table
- **Purpose**: Business categories for organization
- **Key Fields**:
  - `name` (unique)
  - `icon` (emoji)
  - `order` (for sorting)
- **Pre-populated**: 12 default categories

### Businesses Table
- **Purpose**: Business listings
- **Key Fields**:
  - `owner_id` (references users)
  - `category_id` (references categories)
  - `status` ('pending', 'approved', 'rejected')
  - `images` (array of URLs)

### Products Table
- **Purpose**: Products/services for each business
- **Key Fields**:
  - `business_id` (references businesses)
  - `is_active` (boolean)
  - `images` (array of URLs)
  - `price` (decimal)

## Security Features

### Row Level Security (RLS)
All tables have RLS enabled with policies:

**Users:**
- ✅ Anyone can view profiles
- ✅ Users can update their own profile

**Categories:**
- ✅ Anyone can view

**Businesses:**
- ✅ Anyone can view approved businesses
- ✅ Owners can create/update their own

**Products:**
- ✅ Anyone can view active products
- ✅ Owners can manage their business products

### Storage Policies
**Images Bucket:**
- ✅ Public read access
- ✅ Authenticated users can upload
- ✅ Users can manage their own images

## Performance Optimizations

The setup includes:
- 📊 Indexes on frequently queried fields
- 🔍 Full-text search indexes for businesses and products
- ⚡ Automatic `updated_at` timestamp triggers
- 🎯 Optimized foreign key relationships

## Default Categories Included

The setup automatically creates 12 categories:
1. 🍽️ Restaurants
2. 🛒 Groceries
3. 🏥 Healthcare
4. 📚 Education
5. 💆 Beauty & Wellness
6. 🔧 Home Services
7. 💻 Electronics
8. 👔 Fashion
9. 🏘️ Real Estate
10. 🚗 Automotive
11. 🎭 Entertainment
12. 💼 Professional Services

## Troubleshooting

### Issue: "relation already exists"
**Solution**: Some tables may already exist. This is safe to ignore, or you can drop tables first:
```sql
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.businesses CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
```
Then re-run the setup.

### Issue: "permission denied for schema public"
**Solution**: Make sure you're logged in to Supabase and using the SQL Editor.

### Issue: Storage bucket already exists
**Solution**: This is safe. The setup uses `ON CONFLICT DO NOTHING`.

## Next Steps

1. ✅ Run `supabase-setup.sql`
2. ✅ Update your `.env` file with Supabase credentials
3. ✅ Test registration and login
5. ✅ Create your first business listing
6. ✅ Add products to your business

## Need Help?

If you encounter any issues:
1. Check the Supabase logs (Dashboard → Logs)
2. Verify your RLS policies are active
3. Check the browser console for errors
4. Ensure your Supabase URL and keys are correct in `supabase-config.js`

---

**Your Avadh Connect database is ready to go! 🚀**
