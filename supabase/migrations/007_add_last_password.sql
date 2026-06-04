-- Add last_password column to profiles for admin password display
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_password TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN profiles.last_password IS '最后设置的明文密码（供管理后台显示）';
