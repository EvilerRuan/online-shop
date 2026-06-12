-- ============================================================
-- 015_customer_messages.sql
-- 客服消息表
-- ============================================================

CREATE TABLE customer_messages (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text'
        CHECK (message_type IN ('text', 'image')),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customer_messages_user_id ON customer_messages(user_id);
CREATE INDEX idx_customer_messages_is_read ON customer_messages(is_read);
CREATE INDEX idx_customer_messages_created_at ON customer_messages(created_at DESC);

COMMENT ON TABLE customer_messages IS '客服消息表';
COMMENT ON COLUMN customer_messages.sender_type IS '发送方：user=用户, admin=管理员';
COMMENT ON COLUMN customer_messages.content IS '消息内容（文字或图片 URL）';
COMMENT ON COLUMN customer_messages.message_type IS '消息类型：text=文字, image=图片';
COMMENT ON COLUMN customer_messages.is_read IS '管理员是否已读';
