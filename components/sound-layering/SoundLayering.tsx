'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusIcon, PlayIcon, StopCircleIcon, XIcon, SaveIcon } from 'lucide-react';
import { SOUND_CATEGORIES, type Sound, CustomizableSound, LayerData } from '@/lib/types';
import { soundManager } from '@/lib/sound';
import { SoundPicker } from './SoundPicker';
import { SaveSoundModal } from '../sound-customization/SaveSoundModal';
import { useAuth } from '@/lib/contexts/auth-context';
import { uploadCustomSound } from '@/lib/services/storage';
import { soundCustomizationService } from '@/lib/services/sound-customization';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { categoriesService, type UserCategory } from '@/lib/services/categories';

interface SoundLayer {
  id: string;
  sound: Sound;
  volume: number;
  delay: number;
  isPlaying: boolean;
}

interface SoundLayeringProps {
  initialLayers?: LayerData[];
  onClose?: () => void;
}

export function SoundLayering({ initialLayers, onClose }: SoundLayeringProps) {
  const [layers, setLayers] = useState<SoundLayer[]>(() => {
    if (initialLayers) {
      return initialLayers.map(layer => ({
        id: `layer-${Date.now()}-${Math.random()}`,
        sound: layer.sound,
        volume: layer.volume,
        delay: layer.delay,
        isPlaying: false
      }));
    }
    return [];
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const { user } = useAuth();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  const handleAddLayer = (sound: Sound) => {
    const newLayer: SoundLayer = {
      id: `layer-${Date.now()}`,
      sound,
      volume: 100,
      delay: 0,
      isPlaying: false,
    };
    setLayers([...layers, newLayer]);
    setShowSoundPicker(false);
  };

  const handleRemoveLayer = (layerId: string) => {
    setLayers(layers.filter(layer => layer.id !== layerId));
  };

  const handleLayerChange = (layerId: string, key: keyof SoundLayer, value: number) => {
    setLayers(layers.map(layer => {
      if (layer.id === layerId) {
        return { ...layer, [key]: value };
      }
      return layer;
    }));
  };

  const handlePlayAllLayers = async () => {
    if (isPlaying) {
      layers.forEach(layer => {
        soundManager.stopSound(layer.sound.id);
      });
      setIsPlaying(false);
      setLayers(layers.map(layer => ({ ...layer, isPlaying: false })));
      return;
    }

    setIsPlaying(true);
    
    try {
      await Promise.all(layers.map(layer => 
        soundManager.loadSound(layer.sound.id, layer.sound.path)
      ));

      layers.forEach(layer => {
        soundManager.setVolume(layer.sound.id, layer.volume);
        
        setTimeout(() => {
          if (!layer.isPlaying) {
            soundManager.playSound(layer.sound.id);
            setLayers(prevLayers => 
              prevLayers.map(l => 
                l.id === layer.id ? { ...l, isPlaying: true } : l
              )
            );
          }
        }, layer.delay * 1000);
      });

      const maxDelay = Math.max(...layers.map(l => l.delay));
      const approximateSoundDuration = 2;
      const totalDuration = (maxDelay + approximateSoundDuration) * 1000;

      setTimeout(() => {
        setIsPlaying(false);
        setLayers(prevLayers => 
          prevLayers.map(layer => ({ ...layer, isPlaying: false }))
        );
      }, totalDuration);

    } catch (error) {
      console.error('Failed to play layers:', error);
      toast.error('Failed to play sound layers');
      setIsPlaying(false);
      setLayers(layers.map(layer => ({ ...layer, isPlaying: false })));
    }
  };

  const handleSave = async (name: string, categoryId?: string) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const layersData: LayerData[] = layers.map(layer => ({
        sound: layer.sound,
        volume: layer.volume,
        delay: layer.delay
      }));
      
      const combinedAudio = await soundManager.combineLayeredSounds(layersData);
      
      const filename = `layered-sound-${Date.now()}.wav`;
      const downloadUrl = await uploadCustomSound(combinedAudio, filename, user.uid);
      
      const customizableSound: CustomizableSound = {
        id: `layered-${Date.now()}`,
        name,
        path: downloadUrl,
        category: 'layered',
        categoryId,
        layers: layersData
      };

      await soundCustomizationService.saveCustomization(
        customizableSound.id,
        { volume: 100, pitch: 0, speed: 100, duration: 100 },
        user.uid,
        customizableSound
      );

      toast.success('Layered sound saved successfully!');
    } catch (error) {
      console.error('Error saving layered sound:', error);
      toast.error('Failed to save layered sound');
    } finally {
      setIsSaving(false);
      setShowSaveModal(false);
    }
  };

  const selectedLayer = layers.find(layer => layer.id === selectedLayerId);

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Sound Layering</CardTitle>
          <CardDescription className="flex items-center justify-between">
            <span>Combine multiple sounds with custom timing</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSoundPicker(true)}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Sound
            </Button>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timeline View */}
          <div className="relative min-h-[200px] bg-muted/30 rounded-lg p-4">
            {/* Time markers */}
            <div className="absolute top-0 left-0 right-0 h-6 border-b flex">
              {Array.from({ length: 21 }).map((_, i) => (
                <div 
                  key={i} 
                  className="flex-1 border-l text-xs text-muted-foreground"
                  style={{ borderColor: i % 5 === 0 ? 'currentColor' : 'transparent' }}
                >
                  {i % 5 === 0 && <span className="ml-1">{(i / 10).toFixed(1)}s</span>}
                </div>
              ))}
            </div>

            {/* Layers */}
            <div className="mt-8">
              {layers.map((layer, index) => (
                <div 
                  key={layer.id}
                  className="relative h-20"
                >
                  <div 
                    className="absolute left-0 right-0 h-[2px] bg-muted-foreground/20"
                    style={{ top: '50%' }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2"
                    style={{ left: `${(layer.delay / 2) * 100}%` }}
                  >
                    <div 
                      className={cn(
                        "w-40 p-3 rounded-lg shadow-sm transition-all cursor-pointer",
                        "bg-card border hover:border-primary",
                        selectedLayerId === layer.id && "border-primary ring-2 ring-primary ring-opacity-50"
                      )}
                      onClick={() => setSelectedLayerId(layer.id === selectedLayerId ? null : layer.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{layer.sound.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-background/80"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveLayer(layer.id);
                          }}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4">
            <Button
              size="lg"
              onClick={handlePlayAllLayers}
              disabled={layers.length === 0}
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

            <Button
              size="lg"
              variant="outline"
              onClick={() => setShowSaveModal(true)}
              disabled={layers.length === 0}
            >
              <SaveIcon className="mr-2 h-4 w-4" />
              Save Layered Sound
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Layer Settings Card */}
      {selectedLayer && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Layer Settings: {selectedLayer.sound.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Volume</span>
                    <span className="text-sm text-muted-foreground">
                      {selectedLayer.volume}%
                    </span>
                  </div>
                  <Slider
                    value={[selectedLayer.volume]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([value]) => 
                      handleLayerChange(selectedLayer.id, 'volume', value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Delay</span>
                    <span className="text-sm text-muted-foreground">
                      {selectedLayer.delay.toFixed(2)}s
                    </span>
                  </div>
                  <Slider
                    value={[selectedLayer.delay]}
                    min={0}
                    max={2}
                    step={0.05}
                    onValueChange={([value]) => 
                      handleLayerChange(selectedLayer.id, 'delay', value)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Existing modals */}
      <SoundPicker
        open={showSoundPicker}
        onOpenChange={setShowSoundPicker}
        onSelect={handleAddLayer}
      />

      <SaveSoundModal
        open={showSaveModal}
        onOpenChange={setShowSaveModal}
        onSave={handleSave}
        defaultName="Layered Sound"
        isSaving={isSaving}
        categories={userCategories}
      />
    </div>
  );
}