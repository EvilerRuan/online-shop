-- 移除 phone 全局唯一约束，改为 (phone, channel) 组合唯一
-- 这样批发和零售可以使用相同手机号，但同一渠道内手机号唯一

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_phone_key;

-- 添加组合唯一约束（phone + channel）
ALTER TABLE profiles ADD CONSTRAINT profiles_phone_channel_unique UNIQUE (phone, channel);
