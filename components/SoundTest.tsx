'use client';

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { soundManager } from "@/lib/sound";

export function SoundTest() {
  const [isInitialized, setIsInitialized] = useState(false);

  const initializeAudio = async () => {
    if (!isInitialized) {
      await soundManager.loadSound('test', '/sounds/test.mp3').catch(console.error);
      setIsInitialized(true);
    }
  };

  const handlePlay = async () => {
    await initializeAudio();
    soundManager.playSound('test');
  };

  return (
    <div className="flex gap-4">
      <Button onClick={handlePlay}>
        Play Test Sound
      </Button>
    </div>
  );
} 