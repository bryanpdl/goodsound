'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DownloadIcon, LoaderIcon, LockIcon } from 'lucide-react';
import { soundGenerator } from '@/lib/services/sound-generator';
import type { CustomizableSound, SoundCustomizationSettings } from '@/lib/types';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sound: CustomizableSound;
  customization: SoundCustomizationSettings;
}

export function ExportModal({ 
  open, 
  onOpenChange, 
  sound, 
  customization 
}: ExportModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const isPremium = false; // TODO: Implement premium user check

  const handleExport = async (format: 'mp3' | 'wav') => {
    setIsExporting(true);
    try {
      await soundGenerator.loadSound(sound.path);
      const audioBuffer = await soundGenerator.generateVariant(customization);
      
      // Create a blob with the appropriate MIME type
      const mimeType = format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
      const blob = new Blob([audioBuffer], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      // Create a download link and trigger it
      const link = document.createElement('a');
      link.href = url;
      link.download = `${sound.name}-custom.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to export sound:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Sound</DialogTitle>
          <DialogDescription>
            Download your customized version of &quot;{sound.name}&quot;
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => handleExport('mp3')}
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Export MP3
                </>
              )}
            </Button>
            <Button
              onClick={() => handleExport('wav')}
              disabled={!isPremium || isExporting}
              variant={isPremium ? "outline" : "secondary"}
              className="w-full"
            >
              {isPremium ? (
                <>
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Export WAV
                </>
              ) : (
                <>
                  <LockIcon className="mr-2 h-4 w-4" />
                  WAV (Premium)
                </>
              )}
            </Button>
          </div>
          {!isPremium && (
            <p className="text-sm text-muted-foreground">
              Upgrade to Premium to access lossless WAV exports and more features.
            </p>
          )}
        </div>
        <div className="flex justify-end mt-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 