'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoaderIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCategory } from '@/lib/services/categories';

interface SaveSoundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, categoryId?: string) => Promise<void>;
  defaultName: string;
  isSaving: boolean;
  categories?: UserCategory[];
}

export function SaveSoundModal({
  open,
  onOpenChange,
  onSave,
  defaultName,
  isSaving,
  categories = []
}: SaveSoundModalProps) {
  const [name, setName] = useState(defaultName);
  const [categoryId, setCategoryId] = useState<string>("none");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(name, categoryId === "none" ? undefined : categoryId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save Sound</DialogTitle>
          <DialogDescription>
            Give your customized sound a name and optionally assign it to a category
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Sound name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter sound name..."
              autoFocus
            />
          </div>
          {categories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="category">Category (optional)</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            type="button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            type="button"
          >
            {isSaving ? (
              <>
                <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 