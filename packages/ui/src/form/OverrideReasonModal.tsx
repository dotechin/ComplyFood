'use client';

import React, { useState } from 'react';
import { createOverrideSchema, type CreateOverrideInput } from '@complyfood/shared';

interface OverrideReasonModalProps {
  isOpen: boolean;
  logEntryId: string;
  fieldName: string;
  originalValue: any;
  newValue: any;
  onConfirm: (data: CreateOverrideInput) => void;
  onCancel: () => void;
}

export function OverrideReasonModal({
  isOpen,
  logEntryId,
  fieldName,
  originalValue,
  newValue,
  onConfirm,
  onCancel,
}: OverrideReasonModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = createOverrideSchema.safeParse({
      logEntryId,
      fieldName,
      originalValue,
      newValue,
      reason,
    });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    setError('');
    onConfirm(result.data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Override Required</h2>
        <p className="mb-4 text-sm text-gray-500">
          You are changing <strong>{fieldName}</strong> from{' '}
          <strong>{JSON.stringify(originalValue)}</strong> to{' '}
          <strong>{JSON.stringify(newValue)}</strong>. A reason is required.
        </p>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this value was changed..."
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Confirm Override
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
