-- ============================================================
-- 014_after_sales.sql
-- 售后工单表
-- ============================================================

CREATE TABLE after_sales (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id),
    order_item_id BIGINT NOT NULL REFERENCES order_items(id),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('refund', 'return_refund')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'approved', 'rejected', 'completed', 'closed')),
    reason TEXT NOT NULL DEFAULT '',
    refund_amount DECIMAL(10,2) NOT NULL CHECK (refund_amount >= 0),
    evidence_images TEXT[] DEFAULT '{}',
    return_shipping_no TEXT DEFAULT '',
    reject_reason TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_after_sales_user_id ON after_sales(user_id);
CREATE INDEX idx_after_sales_order_id ON after_sales(order_id);
CREATE INDEX idx_after_sales_status ON after_sales(status);
CREATE INDEX idx_after_sales_type ON after_sales(type);

CREATE TRIGGER update_after_sales_updated_at BEFORE UPDATE ON after_sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE after_sales IS '售后工单表';
COMMENT ON COLUMN after_sales.type IS '售后类型：refund=仅退款, return_refund=退货退款';
COMMENT ON COLUMN after_sales.status IS '状态：pending=待处理, processing=处理中, approved=已同意, rejected=已拒绝, completed=已完成, closed=已关闭';
COMMENT ON COLUMN after_sales.reason IS '申请原因';
COMMENT ON COLUMN after_sales.refund_amount IS '退款金额';
COMMENT ON COLUMN after_sales.evidence_images IS '凭证图片 URL 数组';
COMMENT ON COLUMN after_sales.return_shipping_no IS '退货快递单号';
COMMENT ON COLUMN after_sales.reject_reason IS '拒绝原因';
