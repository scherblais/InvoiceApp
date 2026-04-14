import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Realtor } from "@/lib/types";

interface RealtorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Realtor | null;
  onSave: (realtor: Realtor) => void;
  onDelete?: (id: string) => void;
}

export function RealtorDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  onDelete,
}: RealtorDialogProps) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setCompany(initial?.company ?? "");
      setEmail(initial?.email ?? "");
      setPhone(initial?.phone ?? "");
      setNotes(initial?.notes ?? "");
      setError(null);
    }
  }, [open, initial]);

  const handleSave = () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    const realtor: Realtor = {
      id: initial?.id ?? `r_${Date.now()}`,
      name: name.trim(),
      company: company.trim(),
      email: email.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
    };
    onSave(realtor);
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!initial?.id || !onDelete) return;
    if (window.confirm(`Delete ${initial.name}? This cannot be undone.`)) {
      onDelete(initial.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit realtor" : "New realtor"}</DialogTitle>
          <DialogDescription>
            Realtors can be attached to calendar events and notified about
            upcoming shoots.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="realtor-name">Name</Label>
            <Input
              id="realtor-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="realtor-company">Company</Label>
            <Input
              id="realtor-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Press Realty"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="realtor-email">Email</Label>
              <Input
                id="realtor-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="realtor-phone">Phone</Label>
              <Input
                id="realtor-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(514) 555-0123"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="realtor-notes">Notes</Label>
            <Textarea
              id="realtor-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Preferences, referral source, etc."
            />
          </div>
          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </div>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <div>
            {initial && onDelete ? (
              <Button
                variant="ghost"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive"
              >
                Delete
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {initial ? "Save changes" : "Add realtor"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
