ALTER TABLE payment_milestones ADD COLUMN quotation_line_item_id uuid REFERENCES quotation_line_items(id) ON DELETE SET NULL;
CREATE INDEX payment_milestones_quotation_line_idx ON payment_milestones(quotation_line_item_id);
