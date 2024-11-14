'use client';

import { SoundCategory as SoundCategoryType, Sound, CustomizableSound } from '@/lib/types';
import { SoundItem } from './SoundItem';
import { Skeleton } from '@/components/ui/skeleton';

interface SoundCategoryProps {
  category: SoundCategoryType;
  onSoundSelect?: (sound: Sound | CustomizableSound) => void;
  selectedSoundId?: string;
  isLoading?: boolean;
}

export function SoundCategory({ 
  category, 
  onSoundSelect, 
  selectedSoundId,
  isLoading = false 
}: SoundCategoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[120px] w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {category.sounds.map((sound) => {
          if (!sound || !sound.id || !sound.path) {
            console.warn('Invalid sound data:', sound);
            return null;
          }

          return (
            <SoundItem 
              key={sound.id} 
              sound={sound}
              onSelect={onSoundSelect}
              selected={selectedSoundId ? sound.id === selectedSoundId : false}
            />
          );
        }).filter(Boolean)}
        {category.sounds.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {category.id === 'saved' 
              ? "You haven't saved any sounds yet"
              : "No sounds available in this category yet"
            }
          </div>
        )}
      </div>
    </div>
  );
} 