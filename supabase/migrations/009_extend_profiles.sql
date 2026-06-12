-- ============================================================
-- 009_extend_profiles.sql
-- 扩展用户表，增加零售业务字段
-- ============================================================

-- 新增渠道标识（批发/零售）
ALTER TABLE profiles ADD COLUMN channel TEXT NOT NULL DEFAULT 'wholesale'
    CHECK (channel IN ('wholesale', 'retail'));

-- 微信小程序登录字段
ALTER TABLE profiles ADD COLUMN openid TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN unionid TEXT;

-- 用户头像
ALTER TABLE profiles ADD COLUMN avatar_url TEXT DEFAULT '';

-- 推荐关系（推荐人ID）
ALTER TABLE profiles ADD COLUMN referrer_id UUID REFERENCES profiles(id);

-- 积分余额
ALTER TABLE profiles ADD COLUMN points_balance INT NOT NULL DEFAULT 0
    CHECK (points_balance >= 0);

-- 索引
CREATE INDEX idx_profiles_channel ON profiles(channel);
CREATE INDEX idx_profiles_openid ON profiles(openid);
CREATE INDEX idx_profiles_referrer_id ON profiles(referrer_id);

COMMENT ON COLUMN profiles.channel IS '渠道：wholesale=批发, retail=零售';
COMMENT ON COLUMN profiles.openid IS '微信 openid（小程序登录）';
COMMENT ON COLUMN profiles.unionid IS '微信 unionid';
COMMENT ON COLUMN profiles.avatar_url IS '用户头像 URL';
COMMENT ON COLUMN profiles.referrer_id IS '推荐人 ID';
COMMENT ON COLUMN profiles.points_balance IS '积分余额';
