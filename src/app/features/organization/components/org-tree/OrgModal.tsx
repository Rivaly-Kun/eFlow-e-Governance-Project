import * as React from "react";
import { assignOrgHead, createOrg, updateOrg } from "../../../../../lib/supabaseService";
import { FormField, SelectInput, TextInput } from "../../../../components/ui/FormField";
import { Modal, ModalButton } from "../../../../components/ui/Modal";
import { useToast } from "../../../../components/ui/Toast";
import type { Organization, OrgType, UserProfile } from "../../../../types";
import { ORG_TYPE_OPTIONS } from "./orgTreeModel";

export function OrgModal({
  isOpen,
  onClose,
  org,
  parentId,
  orgs,
  profiles,
}: {
  isOpen: boolean;
  onClose: () => void;
  org?: Organization;
  parentId?: string;
  orgs: Organization[];
  profiles: UserProfile[];
}) {
  const { toast } = useToast();
  const isEdit = !!org;
  const [form, setForm] = React.useState({ name: '', org_type: 'department' as OrgType, description: '', parent_id: '', head_user_id: '' });
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (org) {
      setForm({
        name: org.name,
        org_type: org.org_type,
        description: org.description,
        parent_id: org.parent_id || '',
        head_user_id: org.head_user_id || '',
      });
    } else {
      setForm({
        name: '',
        org_type: parentId ? 'division' : 'department',
        description: '',
        parent_id: parentId || '',
        head_user_id: '',
      });
    }
  }, [org, parentId, isOpen]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEdit && org) {
        await updateOrg(org.id, {
          name: form.name.trim(),
          description: form.description.trim(),
        });
        if (form.head_user_id !== org.head_user_id) {
          await assignOrgHead(org.id, form.head_user_id || null);
        }
        toast(`"${form.name}" updated`, 'success');
      } else {
        const newOrg = await createOrg({
          name: form.name.trim(),
          parent_id: form.parent_id || null,
          org_type: form.org_type,
          description: form.description.trim(),
        });
        if (form.head_user_id) {
          await assignOrgHead(newOrg.id, form.head_user_id);
        }
        toast(`"${form.name}" created`, 'success');
      }
      onClose();
    } catch (err: any) {
      toast(err?.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const parentOptions = orgs
    .filter((o) => o.id !== org?.id)
    .map((o) => ({ value: o.id, label: o.name }));

  const headOptions = profiles
    .filter((p) => p.is_active)
    .map((p) => ({ value: p.id, label: `${p.full_name} (${p.email})` }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Organization — ${org?.name}` : 'Add Organization'}
      footer={
        <>
          <ModalButton onClick={onClose}>Cancel</ModalButton>
          <ModalButton variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create'}
          </ModalButton>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Name" error={errors.name} required>
          <TextInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. LEDIPO"
            hasError={!!errors.name}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Org Type">
            <SelectInput
              value={form.org_type}
              onChange={(e) => setForm({ ...form, org_type: e.target.value as OrgType })}
              options={ORG_TYPE_OPTIONS}
            />
          </FormField>
          <FormField label="Parent">
            <SelectInput
              value={form.parent_id}
              onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
              options={[{ value: '', label: 'No parent (root-level)' }, ...parentOptions]}
            />
          </FormField>
        </div>
        <FormField label="Description">
          <TextInput
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Brief description..."
          />
        </FormField>
        <FormField label="Department Head">
          <SelectInput
            value={form.head_user_id}
            onChange={(e) => setForm({ ...form, head_user_id: e.target.value })}
            options={[{ value: '', label: 'No head assigned' }, ...headOptions]}
          />
        </FormField>
      </div>
    </Modal>
  );
}

// ─── Assign Head Modal ───────────────────────────────────────────
