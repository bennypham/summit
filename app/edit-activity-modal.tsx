"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Id } from "@/convex/_generated/dataModel";
import type {
  ActivityTransaction,
  CategoryOption,
} from "./activity-workspace";
import { ActivityTransactionIcon } from "./activity-icons";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

type EditActivityModalProps = {
  transaction: ActivityTransaction;
  categories: CategoryOption[];
  pending: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function EditActivityModal({
  transaction,
  categories,
  pending,
  onClose,
  onSaved,
}: EditActivityModalProps) {
  const [name, setName] = useState(transaction.description);
  const [categoryId, setCategoryId] = useState<Id<"categories"> | null>(
    transaction.categoryId ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [mounted, setMounted] = useState(false);

  const income = transaction.amount < 0;
  const editCategories = categories.filter((c) => c.name !== "Uncategorized");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  async function save() {
    setError(null);
    try {
      const res = await fetch("/api/transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: transaction.id,
          description: name,
          categoryId: transaction.isTransfer ? null : categoryId,
        }),
      });
      if (!res.ok) {
        setError("Could not save changes");
        return;
      }
    } catch {
      setError("Could not save changes");
      return;
    }
    setDirty(false);
    onSaved();
    onClose();
  }

  function reset() {
    setName(transaction.description);
    setCategoryId(transaction.categoryId ?? null);
    setError(null);
    setDirty(false);
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] overflow-y-auto bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-activity-title"
          className="modal-dialog w-full max-w-[520px]"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex items-center justify-between pb-5">
          <h2
            id="edit-activity-title"
            className="text-[20px] font-extrabold tracking-heading text-ink"
          >
            Edit activity
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-field"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              aria-hidden
              className="text-body"
            >
              <line
                x1="6"
                y1="6"
                x2="18"
                y2="18"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line
                x1="18"
                y1="6"
                x2="6"
                y2="18"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3.5 pb-5">
          <ActivityTransactionIcon
            transaction={transaction}
            size="lg"
            className="rounded-2xl"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-bold leading-[22px] text-ink">
              {transaction.description}
            </p>
            <p className="truncate text-caption font-medium text-muted">
              {formatMeta(transaction)}
            </p>
          </div>
          <p
            className={`shrink-0 font-mono text-[20px] font-bold tabular-nums ${
              income ? "text-success" : "text-ink"
            }`}
          >
            {income
              ? `+${usd.format(-transaction.amount)}`
              : `−${usd.format(transaction.amount)}`}
          </p>
        </div>

        <div className="flex flex-col gap-2 pb-[18px]">
          <label
            htmlFor="edit-activity-name"
            className="text-[12px] font-bold tracking-caps text-faint"
          >
            NAME
          </label>
          <input
            id="edit-activity-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
            className="input-field-modal"
          />
        </div>

        {!transaction.isTransfer && (
          <div className="flex flex-col gap-2.5 pb-6">
            <p className="text-[12px] font-bold tracking-caps text-faint">
              CATEGORY
            </p>
            <div className="flex flex-wrap gap-2">
                {editCategories.map((c) => {
                  const active = categoryId === c._id;
                  return (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => {
                        setCategoryId(c._id);
                        setDirty(true);
                      }}
                      className={active ? "chip chip-active" : "chip"}
                    >
                      {c.name}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {transaction.isTransfer && (
          <p className="pb-6 text-caption font-medium text-muted">
            Transfers stay excluded from budget math, but you can rename them.
          </p>
        )}

        {error && <p className="pb-3 text-caption text-danger">{error}</p>}

        <div className="flex gap-2.5">
          <button
            type="button"
            disabled={pending || !dirty}
            onClick={() => void save()}
            className="modal-btn-primary flex-1 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            disabled={pending || !dirty}
            onClick={reset}
            className="modal-btn-secondary shrink-0 disabled:opacity-50"
          >
            Reset
          </button>
        </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function formatMeta(t: ActivityTransaction) {
  const parts = [
    formatDateLabel(t.date),
    t.institutionName,
    t.accountMask ? `·· ${t.accountMask}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

function formatDateLabel(dateKey: string) {
  const d = new Date(`${dateKey}T12:00:00`);
  const todayKey = formatDateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterday);

  if (dateKey === todayKey) return "Today";
  if (dateKey === yesterdayKey) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
