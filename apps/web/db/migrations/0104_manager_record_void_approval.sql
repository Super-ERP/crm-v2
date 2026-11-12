-- Managers review within existing team scope; financial reversal remains separately authorised.
INSERT INTO role_permissions(tenant_id, role_id, permission_id)
SELECT r.tenant_id, r.id, p.id
FROM roles r JOIN permissions p ON p.key = 'record.void.approve'
WHERE lower(trim(r.name)) = 'manager'
ON CONFLICT(role_id, permission_id) DO NOTHING;

UPDATE permissions SET description = 'Review record void requests (Manager / Sales Admin)'
WHERE key = 'record.void.approve';
