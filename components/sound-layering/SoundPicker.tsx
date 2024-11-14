'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SOUND_CATEGORIES, type Sound, type CustomizableSound } from '@/lib/types';
import { SoundItem } from '../sound-library/SoundItem';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/contexts/auth-context';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { soundCustomizationService } from '@/lib/services/sound-customization';

interface SoundPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (sound: Sound | CustomizableSound) => void;
}

export function SoundPicker({ open, onOpenChange, onSelect }: SoundPickerProps) {
  const { user } = useAuth();
  const [showMySounds, setShowMySounds] = useState(false);
  const [savedSounds, setSavedSounds] = useState<CustomizableSound[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState(SOUND_CATEGORIES[0].id);

  useEffect(() => {
    const loadSavedSounds = async () => {
      if (!user) {
        setSavedSounds([]);
        return;
      }

      setIsLoading(true);
      try {
        const sounds = await soundCustomizationService.getUserSavedSounds(user.uid);
        setSavedSounds(sounds);
      } catch (error) {
        console.error('Failed to load saved sounds:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (showMySounds) {
      loadSavedSounds();
    } else {
      setSavedSounds([]);
    }
  }, [user, showMySounds]);

  const handleSelect = (sound: Sound | CustomizableSound) => {
    onSelect(sound);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <DialogTitle>Add Sound Layer</DialogTitle>
              <DialogDescription>
                Select a sound to add to your composition
              </DialogDescription>
            </div>
            {user && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="my-sounds-picker"
                  checked={showMySounds}
                  onCheckedChange={setShowMySounds}
                />
                <Label htmlFor="my-sounds-picker">My Sounds</Label>
              </div>
            )}
          </div>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          {showMySounds ? (
            isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading your sounds...
              </div>
            ) : (
              <div className="space-y-4">
                {savedSounds.length > 0 ? (
                  savedSounds.map((sound) => (
                    <SoundItem
                      key={sound.id}
                      sound={sound}
                      onSelect={handleSelect}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    You haven't saved any sounds yet
                  </div>
                )}
              </div>
            )
          ) : (
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <div className="px-4 sticky top-0 bg-background z-10">
                <TabsList className="w-full justify-center">
                  {SOUND_CATEGORIES.map((category) => (
                    <TabsTrigger key={category.id} value={category.id}>
                      {category.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {SOUND_CATEGORIES.map((category) => (
                <TabsContent key={category.id} value={category.id} className="mt-4">
                  <div className="grid grid-cols-1 gap-4">
                    {category.sounds.map((sound) => (
                      <SoundItem
                        key={sound.id}
                        sound={sound}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}