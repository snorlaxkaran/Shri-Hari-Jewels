"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Pencil, Phone, Plus, Trash2, User } from "lucide-react";
import {
  addDeptContact,
  deleteDeptContact,
  fetchDeptContacts,
  updateDeptContact,
} from "@/lib/api/customers";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  canDeleteDeptContacts,
  canManageDeptContacts,
  isMasterAdmin,
} from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/auth-context";
import { CUSTOMER_DEPARTMENTS } from "@/lib/customers/constants";
import { DepartmentBadge } from "@/lib/customers/badges";
import type {
  CustomerDepartmentContact,
  NewCustomerDeptContactInput,
} from "@/lib/types";

type CustomerDepartmentsTabProps = {
  customerId: string;
};

const emptyForm = (): NewCustomerDeptContactInput => ({
  department: CUSTOMER_DEPARTMENTS[0],
  personName: "",
  email: "",
  phone: "",
});

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function CustomerDepartmentsTab({ customerId }: CustomerDepartmentsTabProps) {
  const { user } = useAuth();
  const role = user?.role;
  const canAdd = role ? canManageDeptContacts(role) : false;
  const canDelete = role ? canDeleteDeptContacts(role) : false;
  const isAdmin = role ? isMasterAdmin(role) : false;

  const [contacts, setContacts] = useState<CustomerDepartmentContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchDeptContacts(customerId);
      setContacts(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load department contacts."));
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const canEditContact = (contact: CustomerDepartmentContact) =>
    isAdmin || (canAdd && contact.createdByUserId === user?.id);

  const handleAdd = async () => {
    if (!addForm.department.trim() || !addForm.personName.trim()) {
      setError("Department and person name are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await addDeptContact(customerId, {
        department: addForm.department.trim(),
        personName: addForm.personName.trim(),
        email: addForm.email?.trim() || undefined,
        phone: addForm.phone?.trim() || undefined,
      });
      await loadContacts();
      setAddForm(emptyForm());
      setAddFormOpen(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to add contact."));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (contact: CustomerDepartmentContact) => {
    setEditingId(contact.id);
    setEditForm({
      department: contact.department,
      personName: contact.personName,
      email: contact.email ?? "",
      phone: contact.phone ?? "",
    });
  };

  const handleUpdate = async (contactId: string) => {
    if (!editForm.department.trim() || !editForm.personName.trim()) {
      setError("Department and person name are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateDeptContact(customerId, contactId, {
        department: editForm.department.trim(),
        personName: editForm.personName.trim(),
        email: editForm.email?.trim() || null,
        phone: editForm.phone?.trim() || null,
      });
      await loadContacts();
      setEditingId(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update contact."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm("Delete this department contact?")) return;
    setError("");
    try {
      await deleteDeptContact(customerId, contactId);
      await loadContacts();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete contact."));
    }
  };

  const renderContactForm = (
    form: NewCustomerDeptContactInput,
    setForm: (value: NewCustomerDeptContactInput) => void,
    onSave: () => void,
    onCancel: () => void,
  ) => (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Department *</label>
        <select
          value={form.department}
          onChange={(e) => setForm({ ...form, department: e.target.value })}
          className={fieldClass}
        >
          {CUSTOMER_DEPARTMENTS.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Person Name *</label>
        <input
          value={form.personName}
          onChange={(e) => setForm({ ...form, personName: e.target.value })}
          className={fieldClass}
        />
      </div>
      <div>
        <label className={labelClass}>Email</label>
        <input
          type="email"
          value={form.email ?? ""}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={fieldClass}
        />
      </div>
      <div>
        <label className={labelClass}>Phone</label>
        <input
          type="tel"
          value={form.phone ?? ""}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className={fieldClass}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Contact"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary px-3 py-1.5 text-xs">
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-zinc-900">Department Contacts</p>
        {canAdd && !addFormOpen && (
          <button
            type="button"
            onClick={() => {
              setAddForm(emptyForm());
              setAddFormOpen(true);
              setEditingId(null);
            }}
            className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs"
          >
            <Plus size={14} />
            Add Contact
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-zinc-400">Loading contacts…</p>
      ) : contacts.length === 0 && !addFormOpen ? (
        <p className="text-sm text-zinc-400">
          No department contacts added yet. Add a contact to track who handles this account.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {contacts.map((contact) =>
            editingId === contact.id ? (
              <div key={contact.id} className="rounded-lg border border-zinc-200 p-4 bg-zinc-50">
                {renderContactForm(editForm, setEditForm, () => handleUpdate(contact.id), () =>
                  setEditingId(null),
                )}
              </div>
            ) : (
              <div key={contact.id} className="rounded-lg border border-zinc-200 p-4 text-sm">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <DepartmentBadge department={contact.department} />
                  <div className="flex gap-1">
                    {canEditContact(contact) && (
                      <button
                        type="button"
                        onClick={() => {
                          setAddFormOpen(false);
                          startEdit(contact);
                        }}
                        className="p-1 text-zinc-400 hover:text-zinc-700"
                        aria-label="Edit contact"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(contact.id)}
                        className="p-1 text-zinc-400 hover:text-red-600"
                        aria-label="Delete contact"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-zinc-600">
                  <p className="flex items-center gap-1.5">
                    <User size={12} className="text-zinc-400 shrink-0" />
                    <span className="text-zinc-400">Name:</span>
                    <span className="font-medium text-zinc-900">{contact.personName}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Mail size={12} className="text-zinc-400 shrink-0" />
                    <span className="text-zinc-400">Email:</span>
                    <span>{contact.email ?? "—"}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone size={12} className="text-zinc-400 shrink-0" />
                    <span className="text-zinc-400">Phone:</span>
                    <span>{contact.phone ?? "—"}</span>
                  </p>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {addFormOpen &&
        renderContactForm(addForm, setAddForm, handleAdd, () => {
          setAddFormOpen(false);
          setAddForm(emptyForm());
        })}
    </div>
  );
}
