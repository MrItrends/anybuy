-- ============================================================
-- AnyBuy Demo Seed Data
-- ============================================================
-- STEP 1: Sign up at http://localhost:3000 with:
--   Email:    demo@anybuy.ng
--   Password: AnyBuy2024!
--   Name:     AnyBuy Demo Store
-- Then complete seller onboarding (store name: "AnyBuy Demo Store")
--
-- STEP 2: Come back here and run this SQL in Supabase SQL Editor
-- ============================================================

-- Grab the demo seller's user ID
DO $$
DECLARE
  v_seller_id uuid;
BEGIN
  SELECT id INTO v_seller_id
  FROM auth.users
  WHERE email = 'demo@anybuy.ng'
  LIMIT 1;

  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Demo account not found. Sign up with demo@anybuy.ng first.';
  END IF;

  -- Ensure profile exists and is a seller
  INSERT INTO public.profiles (id, full_name, role, is_verified, rating, rating_count)
  VALUES (v_seller_id, 'AnyBuy Demo Store', 'seller', true, 4.8, 127)
  ON CONFLICT (id) DO UPDATE
    SET role = 'seller', is_verified = true, rating = 4.8, rating_count = 127,
        full_name = 'AnyBuy Demo Store';

  -- Ensure seller_profile exists
  INSERT INTO public.seller_profiles (user_id, store_name, store_description, total_sales, verified_seller)
  VALUES (
    v_seller_id,
    'AnyBuy Demo Store',
    'Premium verified seller. Fast shipping, best prices on quality pre-owned items across Lagos.',
    127,
    true
  )
  ON CONFLICT (user_id) DO UPDATE
    SET store_name = 'AnyBuy Demo Store',
        store_description = 'Premium verified seller. Fast shipping, best prices on quality pre-owned items across Lagos.',
        total_sales = 127,
        verified_seller = true;

  -- ============================================================
  -- INSERT PRODUCTS
  -- created_at is backdated 45–75 days so real new listings
  -- always rank above seed data in "Recently Listed".
  -- view_count is kept small (realistic early-platform numbers)
  -- so new sellers can compete in "Trending" through real views.
  -- ============================================================

  -- 1. iPhone 14 Pro Max
  WITH ins AS (
    INSERT INTO public.products (
      seller_id, title, description, price, category, subcategory,
      condition, thumbnail_url, location, is_negotiable, is_available,
      view_count, created_at, updated_at
    ) VALUES (
      v_seller_id,
      'iPhone 14 Pro Max 256GB Deep Purple',
      'Used for 6 months. No scratches, always in a case. Comes with original box, charger, and all accessories. Battery health 94%. Unlocked for all networks.',
      650000, 'phones', 'smartphones', 'grade_a',
      'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=800&q=80',
      'Lagos', true, true, 25,
      NOW() - interval '47 days', NOW() - interval '47 days'
    ) RETURNING id
  )
  INSERT INTO public.product_media (product_id, url, type, "order")
  SELECT id, 'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=800&q=80', 'image', 0 FROM ins
  UNION ALL
  SELECT id, 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=800&q=80', 'image', 1 FROM ins;

  -- 2. Samsung Galaxy S23 Ultra
  WITH ins AS (
    INSERT INTO public.products (
      seller_id, title, description, price, category, subcategory,
      condition, thumbnail_url, location, is_negotiable, is_available,
      view_count, created_at, updated_at
    ) VALUES (
      v_seller_id,
      'Samsung Galaxy S23 Ultra 512GB Phantom Black',
      'Barely used — bought as a backup phone. Pen included. No issues whatsoever. Comes with Samsung 45W charger. Face and fingerprint ID working perfectly.',
      720000, 'phones', 'smartphones', 'grade_a',
      'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
      'Lagos', true, true, 16,
      NOW() - interval '52 days', NOW() - interval '52 days'
    ) RETURNING id
  )
  INSERT INTO public.product_media (product_id, url, type, "order")
  SELECT id, 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80', 'image', 0 FROM ins
  UNION ALL
  SELECT id, 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&q=80', 'image', 1 FROM ins;

  -- 3. MacBook Pro M2
  WITH ins AS (
    INSERT INTO public.products (
      seller_id, title, description, price, category, subcategory,
      condition, thumbnail_url, location, is_negotiable, is_available,
      view_count, created_at, updated_at
    ) VALUES (
      v_seller_id,
      'MacBook Pro 14" M2 Pro 16GB 512GB Space Gray',
      'Office use only — no gaming, no heavy rendering. Screen is perfect. Battery cycle count: 48. Comes with original MagSafe charger. macOS Sonoma installed.',
      1450000, 'electronics', 'laptops', 'grade_a',
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
      'Lagos', false, true, 41,
      NOW() - interval '60 days', NOW() - interval '60 days'
    ) RETURNING id
  )
  INSERT INTO public.product_media (product_id, url, type, "order")
  SELECT id, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80', 'image', 0 FROM ins
  UNION ALL
  SELECT id, 'https://images.unsplash.com/photo-1611186871525-96f2a1c7e16d?w=800&q=80', 'image', 1 FROM ins;

  -- 4. AirPods Pro 2nd Gen
  WITH ins AS (
    INSERT INTO public.products (
      seller_id, title, description, price, category, subcategory,
      condition, thumbnail_url, location, is_negotiable, is_available,
      view_count, created_at, updated_at
    ) VALUES (
      v_seller_id,
      'Apple AirPods Pro (2nd Generation) with MagSafe Case',
      'Purchased 3 months ago. Used occasionally. ANC works great. All ear tips included. Case charges fine via Lightning and MagSafe. Will include original box.',
      135000, 'electronics', 'audio', 'grade_a',
      'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&q=80',
      'Lagos', true, true, 23,
      NOW() - interval '55 days', NOW() - interval '55 days'
    ) RETURNING id
  )
  INSERT INTO public.product_media (product_id, url, type, "order")
  SELECT id, 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&q=80', 'image', 0 FROM ins;

  -- 5. Nike Air Jordan 1
  WITH ins AS (
    INSERT INTO public.products (
      seller_id, title, description, price, category, subcategory,
      condition, thumbnail_url, location, is_negotiable, is_available,
      view_count, created_at, updated_at
    ) VALUES (
      v_seller_id,
      'Nike Air Jordan 1 Retro High OG "Chicago" Size 43',
      'Worn twice to events. Comes with original box and extra laces. No crease on toe box. Cleaned and ready to ship. Authentic — receipt available on request.',
      95000, 'fashion', 'shoes', 'grade_b',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
      'Lagos', true, true, 14,
      NOW() - interval '63 days', NOW() - interval '63 days'
    ) RETURNING id
  )
  INSERT INTO public.product_media (product_id, url, type, "order")
  SELECT id, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', 'image', 0 FROM ins
  UNION ALL
  SELECT id, 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800&q=80', 'image', 1 FROM ins;

  -- 6. Sony PS5 Console
  WITH ins AS (
    INSERT INTO public.products (
      seller_id, title, description, price, category, subcategory,
      condition, thumbnail_url, location, is_negotiable, is_available,
      view_count, created_at, updated_at
    ) VALUES (
      v_seller_id,
      'Sony PlayStation 5 Disc Edition + 2 Controllers',
      'Relocating abroad — selling everything. PS5 in perfect condition, used for FIFA and GTA only. Comes with 2 DualSense controllers and all cables. No scratches.',
      580000, 'electronics', 'gaming', 'grade_a',
      'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=800&q=80',
      'Abuja', true, true, 50,
      NOW() - interval '45 days', NOW() - interval '45 days'
    ) RETURNING id
  )
  INSERT INTO public.product_media (product_id, url, type, "order")
  SELECT id, 'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=800&q=80', 'image', 0 FROM ins
  UNION ALL
  SELECT id, 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=800&q=80', 'image', 1 FROM ins;

  -- 7. Leather Sofa Set
  WITH ins AS (
    INSERT INTO public.products (
      seller_id, title, description, price, category, subcategory,
      condition, thumbnail_url, location, is_negotiable, is_available,
      view_count, created_at, updated_at
    ) VALUES (
      v_seller_id,
      '7-Seater Leather Sofa Set (3+2+1+1) Dark Brown',
      'Moving to a smaller apartment. This set has been with us for 2 years — kept in excellent condition (no kids, no pets). Genuine leather, no tears or stains. Buyer arranges pickup from Lekki Phase 1.',
      380000, 'home', 'furniture', 'grade_b',
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
      'Lagos', true, true, 7,
      NOW() - interval '70 days', NOW() - interval '70 days'
    ) RETURNING id
  )
  INSERT INTO public.product_media (product_id, url, type, "order")
  SELECT id, 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80', 'image', 0 FROM ins
  UNION ALL
  SELECT id, 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&q=80', 'image', 1 FROM ins;

  -- 8. Canon EOS R6 Camera
  WITH ins AS (
    INSERT INTO public.products (
      seller_id, title, description, price, category, subcategory,
      condition, thumbnail_url, location, is_negotiable, is_available,
      view_count, created_at, updated_at
    ) VALUES (
      v_seller_id,
      'Canon EOS R6 Mark II Body Only (Shutter Count: 4,200)',
      'Professional camera used for events and studio shoots. Very low shutter count for its age. Sensor is clean. Comes with 2 batteries, charger, and original strap. No adapter included.',
      980000, 'electronics', 'cameras', 'grade_a',
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80',
      'Port Harcourt', false, true, 19,
      NOW() - interval '75 days', NOW() - interval '75 days'
    ) RETURNING id
  )
  INSERT INTO public.product_media (product_id, url, type, "order")
  SELECT id, 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80', 'image', 0 FROM ins
  UNION ALL
  SELECT id, 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80', 'image', 1 FROM ins;

  RAISE NOTICE 'Seed complete! 8 products inserted for seller: %', v_seller_id;
END $$;
