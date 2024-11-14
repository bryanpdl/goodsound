'use client';

import Image from "next/image";
import { useState, useEffect } from "react";
import { SoundLibrary } from "@/components/sound-library/SoundLibrary";
import { SoundCustomization } from "@/components/sound-customization/SoundCustomization";
import { CustomizableSound } from "@/lib/types";
import { SoundLayering } from "@/components/sound-layering/SoundLayering";
import { SOUND_CATEGORIES } from "@/lib/types";
import type { Sound, SoundCustomizationSettings } from "@/lib/types";
import { soundCustomizationService } from "@/lib/services/sound-customization";
import { Button } from "@/components/ui/button";
import { LayersIcon, Waves } from "lucide-react";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const DEFAULT_CUSTOMIZATION: SoundCustomizationSettings = {
  volume: 100,
  pitch: 0,
  duration: 100,
  speed: 100,
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [selectedSound, setSelectedSound] = useState<Sound>(SOUND_CATEGORIES[0].sounds[0]);
  const [customization, setCustomization] = useState<SoundCustomizationSettings>(DEFAULT_CUSTOMIZATION);
  const [isSaving, setIsSaving] = useState(false);
  const [showLayering, setShowLayering] = useState(false);
  const [editingLayeredSound, setEditingLayeredSound] = useState<CustomizableSound | null>(null);

  // Load saved customization when sound is selected
  useEffect(() => {
    const loadCustomization = async () => {
      const saved = await soundCustomizationService.getCustomization(selectedSound.id);
      if (saved) {
        setCustomization(saved);
      } else {
        setCustomization(DEFAULT_CUSTOMIZATION);
      }
    };

    loadCustomization();
  }, [selectedSound.id]);

  const handleCustomizationChange = async (newCustomization: SoundCustomizationSettings) => {
    setCustomization(newCustomization);
    
    // Debounce saving to avoid too many writes
    if (!isSaving) {
      setIsSaving(true);
      setTimeout(async () => {
        await soundCustomizationService.saveCustomization(selectedSound.id, newCustomization);
        setIsSaving(false);
      }, 500);
    }
  };

  const handleSoundSelect = (sound: Sound) => {
    setSelectedSound(sound);
  };

  // Cleanup WaveSurfer when toggling views
  useEffect(() => {
    return () => {
      // Force cleanup of any existing WaveSurfer instances
      const waveformContainer = document.querySelector('wave');
      if (waveformContainer) {
        waveformContainer.remove();
      }
    };
  }, [showLayering]);

  const handleEditLayeredSound = (sound: CustomizableSound) => {
    setEditingLayeredSound(sound);
    setShowLayering(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="container flex h-[60px] items-center justify-between">
          <div className="flex items-center gap-2">
            <Waves className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">goodsound.ai</span>
          </div>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                    <AvatarFallback>
                      {user.displayName?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="px-4 py-2">
                  <p className="text-sm font-medium">{user.displayName || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuItem onClick={signOut}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </header>

      {/* Main Content - Add flex-1 to allow it to grow */}
      <main className="flex-1 container mx-auto p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-start">
            <section className="space-y-4">
              <h1 className="text-4xl font-bold">UI Sound Generator</h1>
              <p className="text-lg text-muted-foreground">
                Create, customize, and export high-quality UI sounds.
              </p>
            </section>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLayering(!showLayering)}
              className={cn(
                "transition-all duration-200 ease-in-out",
                showLayering && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground/90"
              )}
            >
              <LayersIcon className="mr-2 h-4 w-4" />
              Sound Layering
            </Button>
          </div>

          {showLayering ? (
            <SoundLayering 
              initialLayers={editingLayeredSound?.layers}
              onClose={() => {
                setShowLayering(false);
                setEditingLayeredSound(null);
              }}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <section className="h-full">
                <SoundLibrary 
                  onSoundSelect={handleSoundSelect}
                  selectedSoundId={selectedSound.id}
                  onEditLayeredSound={handleEditLayeredSound}
                />
              </section>
              <section className="lg:sticky lg:top-[76px]">
                <SoundCustomization 
                  sound={selectedSound}
                  onCustomizationChange={handleCustomizationChange}
                  initialCustomization={customization}
                />
              </section>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="flex h-[40px] items-center justify-center border-t px-6 text-sm text-muted-foreground">
        <p>© 2024 UI8 Studio. All rights reserved.</p>
      </footer>
    </div>
  );
}
