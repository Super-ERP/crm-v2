ALTER TYPE sales_order_status ADD VALUE IF NOT EXISTS 'void';
--> statement-breakpoint
ALTER TABLE payment_milestones ADD COLUMN deleted_at timestamptz;
ALTER TABLE deal_costs ADD COLUMN deleted_at timestamptz;
ALTER TABLE contract_years ADD COLUMN deleted_at timestamptz;
--> statement-breakpoint
CREATE TABLE record_void_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
 entity_type text NOT NULL CHECK(entity_type IN ('lead','account','person','product','opportunity','funnel','quotation','project','payment_milestone','sales_order','finance_doc','contract','contract_year','deal_cost')),
 entity_id uuid NOT NULL, requester_member_id text NOT NULL REFERENCES member(id), reason text NOT NULL,
 impact jsonb NOT NULL,status approval_status NOT NULL DEFAULT 'pending',decision_note text,decided_by_member_id text REFERENCES member(id),requested_at timestamptz NOT NULL DEFAULT now(),decided_at timestamptz
);
CREATE UNIQUE INDEX record_void_one_pending ON record_void_requests(tenant_id,entity_type,entity_id) WHERE status='pending';
CREATE INDEX record_void_target_history ON record_void_requests(tenant_id,entity_type,entity_id,status);
CREATE INDEX record_void_requester ON record_void_requests(tenant_id,requester_member_id,requested_at);
ALTER TABLE record_void_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_void_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON record_void_requests USING(tenant_id=current_setting('app.current_tenant',true)) WITH CHECK(tenant_id=current_setting('app.current_tenant',true));
--> statement-breakpoint
INSERT INTO permissions(key,description) VALUES('record.void.approve','Review record void requests (Sales Admin)'),('finance.reverse','Approve posted financial reversals') ON CONFLICT(key) DO NOTHING;
INSERT INTO role_permissions(tenant_id,role_id,permission_id)
 SELECT r.tenant_id,r.id,p.id FROM roles r JOIN permissions p ON p.key IN ('record.void.approve','finance.reverse')
 WHERE r.name IN ('Owner','Admin') OR (lower(r.name) IN ('sales admin','sales administrator') AND p.key='record.void.approve')
 ON CONFLICT(role_id,permission_id) DO NOTHING;
--> statement-breakpoint
CREATE FUNCTION guard_voided_record_write() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND to_jsonb(NEW)=to_jsonb(OLD) THEN RETURN NEW; END IF;
 IF EXISTS(SELECT 1 FROM record_void_requests r WHERE r.tenant_id=to_jsonb(OLD)->>'tenant_id' AND r.entity_type=TG_ARGV[0] AND r.entity_id=(to_jsonb(OLD)->>'id')::uuid AND r.status='approved') THEN
  RAISE EXCEPTION 'Voided records are read-only. Create a new record instead.';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE FUNCTION guard_inactive_record_parent() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_id uuid; parent_data jsonb;
BEGIN
 parent_id := (to_jsonb(NEW)->>TG_ARGV[1])::uuid;
 IF parent_id IS NULL THEN RETURN NEW; END IF;
 -- Unchanged historical links are retained; changing or creating a link needs a live parent.
 IF TG_OP='UPDATE' AND (to_jsonb(OLD)->>TG_ARGV[1]) IS NOT DISTINCT FROM (to_jsonb(NEW)->>TG_ARGV[1]) THEN RETURN NEW; END IF;
 EXECUTE format('SELECT to_jsonb(p) FROM %I p WHERE p.id=$1 AND p.tenant_id=$2',TG_ARGV[0]) INTO parent_data USING parent_id,to_jsonb(NEW)->>'tenant_id';
 IF parent_data IS NULL OR parent_data->>'deleted_at' IS NOT NULL OR coalesce(parent_data->>'status','') IN ('void','cancelled') THEN
  RAISE EXCEPTION 'Cannot attach to an inactive or voided record.';
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
DO $$
DECLARE item record;
BEGIN
 FOR item IN SELECT * FROM (VALUES
 ('leads','lead'),('accounts','account'),('persons','person'),('products','product'),('opportunities','opportunity'),('funnels','funnel'),('quotations','quotation'),('projects','project'),('payment_milestones','payment_milestone'),('sales_orders','sales_order'),('finance_docs','finance_doc'),('contracts','contract'),('contract_years','contract_year'),('deal_costs','deal_cost')) x(table_name,entity_type)
 LOOP
  EXECUTE format('CREATE TRIGGER lifecycle_readonly BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION guard_voided_record_write(%L)',item.table_name,item.entity_type);
 END LOOP;
 FOR item IN SELECT * FROM (VALUES
 ('accounts','accounts','parent_account_id'),('accounts','accounts','end_user_account_id'),('persons','accounts','account_id'),('opportunities','accounts','account_id'),('opportunities','persons','primary_person_id'),('opportunities','persons','owner_contact_id'),('opportunities','persons','power_sponsor_contact_id'),('funnels','persons','primary_person_id'),('funnels','accounts','account_id'),('funnels','opportunities','opportunity_id'),
 ('quotations','funnels','funnel_id'),('quotations','accounts','bill_to_account_id'),('quotations','persons','attention_contact_id'),
 ('projects','accounts','account_id'),('projects','funnels','funnel_id'),('projects','quotations','quotation_id'),
 ('sales_orders','projects','project_id'),('finance_docs','projects','project_id'),('finance_docs','sales_orders','sales_order_id'),('finance_docs','finance_docs','parent_id'),('finance_docs','payment_milestones','milestone_id'),
 ('payment_milestones','projects','project_id'),('payment_milestones','funnels','funnel_id'),('payment_milestones','quotations','quotation_id'),
 ('deal_costs','funnels','funnel_id'),('contract_years','funnels','funnel_id'),('contracts','funnels','funnel_id'),('contracts','accounts','account_id'),
 ('quotation_line_items','quotations','quotation_id'),('quotation_line_items','products','product_id'),('opportunity_products','funnels','funnel_id'),('opportunity_products','products','product_id')) x(child_table,parent_table,column_name)
 LOOP
  EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION guard_inactive_record_parent(%L,%L)', 'lifecycle_parent_'||item.column_name,item.child_table,item.parent_table,item.column_name);
 END LOOP;
END $$;
--> statement-breakpoint
CREATE FUNCTION lock_lifecycle_statement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE tenant text;
BEGIN
 tenant:=current_setting('app.current_tenant',true);
 IF nullif(tenant,'') IS NOT NULL THEN PERFORM pg_advisory_xact_lock(hashtextextended('crm:lifecycle:'||tenant,0)); END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
DO $$
DECLARE table_name text;
BEGIN
 FOREACH table_name IN ARRAY ARRAY['leads','accounts','persons','products','opportunities','funnels','quotations','projects','payment_milestones','sales_orders','finance_docs','contracts','contract_years','deal_costs','quotation_line_items','opportunity_products'] LOOP
 EXECUTE format('CREATE TRIGGER lifecycle_lock BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH STATEMENT EXECUTE FUNCTION lock_lifecycle_statement()',table_name);
 END LOOP;
END $$;
