'use client';

import { useState, useEffect } from 'react';
import { Sound, CustomizableSound } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PlayIcon, StopCircleIcon, TrashIcon, LayersIcon, PencilIcon } from 'lucide-react';
import { soundManager } from '@/lib/sound';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface SoundItemProps {
  sound: Sound | CustomizableSound;
  onSelect?: (sound: Sound | CustomizableSound) => void;
  selected?: boolean;
  onDelete?: (sound: CustomizableSound) => Promise<void>;
  onEdit?: (sound: CustomizableSound) => void;
  showDeleteButton?: boolean;
}

const isLayeredSound = (sound: Sound | CustomizableSound): boolean => {
  return 'category' in sound && sound.category === 'layered';
};

export function SoundItem({ 
  sound, 
  onSelect, 
  selected,
  onDelete,
  onEdit,
  showDeleteButton = false
}: SoundItemProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    return () => {
      soundManager.stopSound(sound.id);
    };
  }, [sound.id]);

  const handlePlayStop = async () => {
    if (isPlaying) {
      soundManager.stopSound(sound.id);
      setIsPlaying(false);
    } else {
      try {
        await soundManager.loadSound(sound.id, sound.path);
        if ('customization' in sound && sound.customization) {
          soundManager.updateSoundCustomization(sound.id, sound.customization);
        }
        soundManager.playSound(sound.id);
        setIsPlaying(true);

        const duration = 1000 * (
          'customization' in sound && sound.customization 
            ? sound.customization.duration / 100 
            : 1
        );

        setTimeout(() => {
          setIsPlaying(false);
        }, duration);
      } catch (error) {
        console.error('Error playing sound:', error);
        setIsPlaying(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(sound as CustomizableSound);
      toast.success('Sound deleted successfully');
    } catch (error) {
      console.error('Error deleting sound:', error);
      toast.error('Failed to delete sound');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Card 
        className={cn(
          "transition-colors hover:bg-accent group",
          selected && "bg-accent",
          onSelect && "cursor-pointer"
        )}
        onClick={onSelect ? () => onSelect(sound) : undefined}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{sound.name}</span>
                {isLayeredSound(sound) && (
                  <LayersIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex gap-2">
                {showDeleteButton && isLayeredSound(sound) && onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(sound as CustomizableSound);
                    }}
                    className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                )}
                {showDeleteButton && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteDialog(true);
                    }}
                    className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <TrashIcon className="h-4 w-4 text-destructive" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayStop();
                  }}
                  className="h-8 w-8 shrink-0"
                >
                  {isPlaying ? (
                    <StopCircleIcon className="h-4 w-4" />
                  ) : (
                    <PlayIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            {sound.tags && sound.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sound.tags.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="secondary" 
                    className={cn(
                      "text-xs transition-colors",
                      "group-hover:bg-accent-foreground/10",
                      selected && "bg-accent-foreground/10",
                      "group-hover:text-accent-foreground",
                      selected && "text-accent-foreground"
                    )}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sound</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{sound.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 