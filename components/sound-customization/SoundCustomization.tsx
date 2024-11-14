'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { PlayIcon, StopCircleIcon, RotateCcwIcon, DownloadIcon, SaveIcon } from 'lucide-react';
import { CustomizableSound, type SoundCustomizationSettings } from '@/lib/types';
import { soundManager } from '@/lib/sound';
import { ExportModal } from './ExportModal';
import { Separator } from "@/components/ui/separator";
import { useAuth } from '@/lib/contexts/auth-context';
import { soundCustomizationService } from '@/lib/services/sound-customization';
import { toast } from 'sonner';
import { SaveSoundModal } from './SaveSoundModal';
import { uploadCustomSound } from '@/lib/services/storage';
import { categoriesService, type UserCategory } from '@/lib/services/categories';

interface SoundCustomizationProps {
  sound: CustomizableSound;
  onCustomizationChange?: (customization: SoundCustomizationSettings) => void;
  initialCustomization?: SoundCustomizationSettings;
}

const DEFAULT_SETTINGS: SoundCustomizationSettings = {
  volume: 100,
  pitch: 0,
  speed: 100,
  duration: 100,
};

function WaveformVisualization({ isPlaying }: { isPlaying: boolean }) {
  // Generate 50 bars with random heights
  const bars = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    height: Math.random() * 60 + 20, // Random height between 20 and 80
  }));

  return (
    <div className="relative w-full h-32 bg-secondary/10 rounded-lg overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 600 100"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {bars.map((bar) => (
            <motion.rect
              key={bar.id}
              x={bar.id * (600 / 50)}
              y={50 - bar.height / 2}
              width={8}
              height={bar.height}
              fill="currentColor"
              initial={{ opacity: 0.2, scaleY: 0.3 }}
              animate={{ 
                opacity: isPlaying ? 0.8 : 0.2,
                scaleY: isPlaying ? 0.45 : 0.3,
              }}
              transition={{ 
                duration: 0.15,
                repeat: isPlaying ? Infinity : 0,
                repeatType: "reverse"
              }}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

export function SoundCustomization({ 
  sound, 
  onCustomizationChange,
  initialCustomization 
}: SoundCustomizationProps) {
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [customization, setCustomization] = useState<SoundCustomizationSettings>(
    initialCustomization ?? DEFAULT_SETTINGS
  );
  const [showExportModal, setShowExportModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);

  useEffect(() => {
    const loadCategories = async () => {
      if (!user) return;
      try {
        const categories = await categoriesService.getUserCategories(user.uid);
        setUserCategories(categories);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };

    loadCategories();
  }, [user]);

  const handleSettingChange = async (key: keyof SoundCustomizationSettings, value: number) => {
    const newCustomization = {
      ...customization,
      [key]: value,
    };
    setCustomization(newCustomization);
    onCustomizationChange?.(newCustomization);
  };

  const handleSliderComplete = async () => {
    try {
      await soundManager.loadSound(sound.id, sound.path, true);
      soundManager.updateSoundCustomization(sound.id, customization);
      soundManager.playSound(sound.id, true);
      
      const duration = 1000 * (
        'customization' in sound && sound.customization 
          ? sound.customization.duration / 100 
          : 1
      );
      setTimeout(() => {
        soundManager.stopSound(sound.id, true);
      }, duration);
    } catch (error) {
      console.error('Error playing preview:', error);
    }
  };

  const handleReset = () => {
    setCustomization(DEFAULT_SETTINGS);
    onCustomizationChange?.(DEFAULT_SETTINGS);
  };

  const handleSave = async (name: string, categoryId?: string) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      // First, export the modified audio
      const audioBlob = await soundManager.exportSound(sound.id, customization);
      const filename = `custom-${sound.id}-${Date.now()}.wav`;
      
      // Upload the modified audio to Firebase Storage
      const downloadUrl = await uploadCustomSound(audioBlob, filename, user.uid);
      
      const customizableSound: CustomizableSound = {
        id: `custom-${sound.id}-${Date.now()}`,
        name,
        path: downloadUrl, // Use the new storage URL instead of the original path
        category: 'custom',
        categoryId,
        customization: customization
      };

      await soundCustomizationService.saveCustomization(
        customizableSound.id,
        customization,
        user.uid,
        customizableSound
      );

      toast.success('Sound saved successfully!');
    } catch (error) {
      console.error('Error saving sound:', error);
      toast.error('Failed to save sound');
    } finally {
      setIsSaving(false);
      setShowSaveModal(false);
    }
  };

  const handlePlay = async () => {
    if (isPlaying) {
      soundManager.stopSound(sound.id, true);
      setIsPlaying(false);
    } else {
      try {
        await soundManager.loadSound(sound.id, sound.path, true);
        soundManager.updateSoundCustomization(sound.id, customization);
        soundManager.playSound(sound.id, true);
        setIsPlaying(true);

        const duration = 1000 * (
          'customization' in sound && sound.customization 
            ? sound.customization.duration / 100 
            : 1
        );

        // Reset playing state after sound ends
        setTimeout(() => {
          setIsPlaying(false);
        }, duration);
      } catch (error) {
        console.error('Error playing sound:', error);
        setIsPlaying(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      soundManager.stopSound(sound.id);
    };
  }, [sound.id]);

  return (
    <Card className="w-full mt-2">
      <CardHeader>
        <CardTitle>{sound.name}</CardTitle>
        <CardDescription>Customize your sound</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <WaveformVisualization isPlaying={isPlaying} />

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Volume</span>
              <span className="text-sm text-muted-foreground">{customization.volume}%</span>
            </div>
            <Slider
              value={[customization.volume]}
              min={0}
              max={100}
              step={1}
              onValueChange={([value]) => handleSettingChange('volume', value)}
              onValueCommit={() => handleSliderComplete()}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Pitch</span>
              <span className="text-sm text-muted-foreground">{customization.pitch}</span>
            </div>
            <Slider
              value={[customization.pitch]}
              min={-12}
              max={12}
              step={1}
              onValueChange={([value]) => handleSettingChange('pitch', value)}
              onValueCommit={() => handleSliderComplete()}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Speed</span>
              <span className="text-sm text-muted-foreground">{customization.speed}%</span>
            </div>
            <Slider
              value={[customization.speed]}
              min={50}
              max={200}
              step={1}
              onValueChange={([value]) => handleSettingChange('speed', value)}
              onValueCommit={() => handleSliderComplete()}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Duration</span>
              <span className="text-sm text-muted-foreground">{customization.duration}%</span>
            </div>
            <Slider
              value={[customization.duration]}
              min={50}
              max={200}
              step={1}
              onValueChange={([value]) => handleSettingChange('duration', value)}
              onValueCommit={() => handleSliderComplete()}
            />
          </div>
        </div>

        <Separator />

        <div className="flex justify-between gap-4">
          <Button
            size="lg"
            variant="outline"
            onClick={handleReset}
            className="w-32"
          >
            <RotateCcwIcon className="mr-2 h-4 w-4" />
            Reset
          </Button>

          <Button
            size="lg"
            onClick={handlePlay}
            className="w-32"
          >
            {isPlaying ? (
              <>
                <StopCircleIcon className="mr-2 h-4 w-4" />
                Stop
              </>
            ) : (
              <>
                <PlayIcon className="mr-2 h-4 w-4" />
                Preview
              </>
            )}
          </Button>

          {user && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => setShowSaveModal(true)}
              className="w-32"
            >
              <SaveIcon className="mr-2 h-4 w-4" />
              Save
            </Button>
          )}

          <Button
            size="lg"
            variant="outline"
            onClick={() => setShowExportModal(true)}
            className="w-32"
          >
            <DownloadIcon className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </CardContent>

      <ExportModal
        open={showExportModal}
        onOpenChange={setShowExportModal}
        sound={sound}
        customization={customization}
      />

      <SaveSoundModal
        open={showSaveModal}
        onOpenChange={setShowSaveModal}
        onSave={handleSave}
        defaultName={`Custom ${sound.name}`}
        isSaving={isSaving}
        categories={userCategories}
      />
    </Card>
  );
} 