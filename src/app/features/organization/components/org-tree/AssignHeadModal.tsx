import * as React from "react";
import { assignOrgHead } from "../../../../../lib/supabaseService";
import { FormField, SelectInput } from "../../../../components/ui/FormField";
import { Modal, ModalButton } from "../../../../components/ui/Modal";
import { useToast } from "../../../../components/ui/Toast";
import type { Organization, UserProfile } from "../../../../types";

export function AssignHeadModal({
  isOpen,
  onClose,
  org,
  profiles,
}: {
  isOpen: boolean;
  onClose: () => void;
  org: Organization | null;
  profiles: UserProfile[];
}) {
  const { toast } = useToast();
  const [selected, setSelected] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (org) setSelected(org.head_user_id || '');
  }, [org, isOpen]);

  const handleSave = async () => {
    if (!org) return;
    setSaving(true);
    try {
      await assignOrgHead(org.id, selected || null);
      toast(`Head updated for ${org.name}`, 'success');
      onClose();
    } catch (err: any) {
      toast(err?.message || 'Failed to assign head', 'error');
    } finally {
      setSaving(false);
    }
  };

  const headOptions = profiles
    .filter((p) => p.is_active)
    .map((p) => ({ value: p.id, label: `${p.full_name} (${p.email})` }));

  if (!org) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Head — ${org.name}`}
      footer={
        <>
          <ModalButton onClick={onClose}>Cancel</ModalButton>
          <ModalButton variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Assign'}
          </ModalButton>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Department Head">
          <SelectInput
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            options={[{ value: '', label: 'No head assigned' }, ...headOptions]}
          />
        </FormField>
      </div>
    </Modal>
  );
}

// ─── Users Panel (right sidebar) ─────────────────────────────────
