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
import type { Client } from "@/lib/types";

interface NewClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (client: Client) => void;
}

export function NewClientDialog({
  open,
  onOpenChange,
  onCreate,
}: NewClientDialogProps) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setCompany("");
      setEmail("");
      setError(null);
    }
  }, [open]);

  const handleCreate = () => {
    if (!name.trim() && !company.trim()) {
      setError("Enter a name or company");
      return;
    }
    const client: Client = {
      id: `c_${Date.now()}`,
      name: name.trim(),
      company: company.trim(),
      email: email.trim(),
    };
    onCreate(client);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New client</DialogTitle>
          <DialogDescription>
            Add a new client you can bill. Use company for agencies/brokerages.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-name">Name</Label>
            <Input
              id="client-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-company">Company</Label>
            <Input
              id="client-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Press Realty"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-email">Email</Label>
            <Input
              id="client-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </div>
          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Add client</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
