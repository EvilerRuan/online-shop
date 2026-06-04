-- Add title column to banners table
ALTER TABLE banners ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
