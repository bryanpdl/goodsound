'use client';

import { useState, useEffect } from 'react';
import { SOUND_CATEGORIES } from '@/lib/types';
import { SoundCategory } from './SoundCategory';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { Sound, CustomizableSound } from '@/lib/types';
import { useAuth } from '@/lib/contexts/auth-context';
import { soundCustomizationService } from '@/lib/services/sound-customization';
import { deleteCustomSound } from '@/lib/services/storage';
import { SoundItem } from './SoundItem';
import { soundManager } from '@/lib/sound';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { PlusCircleIcon, MoreHorizontalIcon, PencilIcon, TrashIcon, ChevronDownIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateCategoryModal } from './CreateCategoryModal';
import { categoriesService, type UserCategory } from '@/lib/services/categories';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface SoundLibraryProps {
  onSoundSelect: (sound: Sound | CustomizableSound) => void;
  selectedSoundId?: string;
  onEditLayeredSound?: (sound: CustomizableSound) => void;
}

interface CategoryAction {
  id: string;
  name: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
}

export function SoundLibrary({ 
  onSoundSelect, 
  selectedSoundId,
  onEditLayeredSound 
}: SoundLibraryProps) {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState(SOUND_CATEGORIES[0].id);
  const [showMySounds, setShowMySounds] = useState(false);
  const [savedSounds, setSavedSounds] = useState<CustomizableSound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [activeMySoundsCategory, setActiveMySoundsCategory] = useState('all');
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<UserCategory | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<UserCategory | null>(null);

  useEffect(() => {
    const loadSavedSounds = async () => {
      if (!user) {
        setSavedSounds([]);
        setIsLoading(false);
        return;
      }

      try {
        const sounds = await soundCustomizationService.getUserSavedSounds(user.uid);
        console.log('Loaded saved sounds:', sounds);
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
      setIsLoading(false);
    }
  }, [user, showMySounds]);

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

    if (showMySounds) {
      loadCategories();
    }
  }, [user, showMySounds]);

  const savedSoundsCategory = {
    id: 'saved',
    name: 'Saved Sounds',
    description: 'Your customized and saved sounds',
    sounds: savedSounds
  };

  const handleSoundSelect = (sound: Sound | CustomizableSound) => {
    if (onSoundSelect) {
      onSoundSelect(sound);
    }
  };

  const handleDeleteSound = async (sound: CustomizableSound) => {
    if (!user) return;
    
    try {
      // Delete from storage
      await deleteCustomSound(sound.path);
      
      // Delete from database
      await soundCustomizationService.deleteCustomSound(sound.id, user.uid);
      
      // Refresh the saved sounds list
      const updatedSounds = await soundCustomizationService.getUserSavedSounds(user.uid);
      setSavedSounds(updatedSounds);
    } catch (error) {
      console.error('Error deleting sound:', error);
      throw error;
    }
  };

  const handleEditLayers = (sound: CustomizableSound) => {
    if (onEditLayeredSound) {
      onEditLayeredSound(sound);
    }
  };

  const sortSoundsByCreationTime = (sounds: CustomizableSound[]) => {
    return [...sounds].sort((a, b) => {
      // Extract timestamps from IDs
      const getTimestamp = (id: string) => {
        // Handle both formats: 'layered-{timestamp}' and 'custom-{soundId}-{timestamp}'
        const matches = id.match(/\d+$/); // Match the last sequence of digits
        return matches ? parseInt(matches[0]) : 0;
      };
      
      // Sort in descending order (newest first)
      return getTimestamp(b.id) - getTimestamp(a.id);
    });
  };

  const handlePlaySound = async (sound: Sound | CustomizableSound) => {
    try {
      // Check if it's a layered sound
      if ('layers' in sound && sound.layers) {
        // Stop any currently playing sounds
        soundManager.stopAllSounds();
        
        // Load and play each layer with its delay
        await Promise.all(sound.layers.map(layer => 
          soundManager.loadSound(layer.sound.id, layer.sound.path)
        ));

        sound.layers.forEach(layer => {
          soundManager.setVolume(layer.sound.id, layer.volume);
          setTimeout(() => {
            soundManager.playSound(layer.sound.id);
          }, layer.delay * 1000);
        });

        // Calculate total duration for cleanup
        const maxDelay = Math.max(...sound.layers.map(l => l.delay));
        const approximateSoundDuration = 2; // seconds
        const totalDuration = (maxDelay + approximateSoundDuration) * 1000;

        // Cleanup after playback
        setTimeout(() => {
          soundManager.stopAllSounds();
        }, totalDuration);
      } else {
        // Regular sound playback
        await soundManager.loadSound(sound.id, sound.path);
        soundManager.playSound(sound.id);
        
        // Stop after approximate duration
        setTimeout(() => {
          soundManager.stopSound(sound.id);
        }, 2000);
      }
    } catch (error) {
      console.error('Error playing sound:', error);
      toast.error('Failed to play sound');
    }
  };

  const handleCreateCategory = async (name: string) => {
    if (!user) return;
    
    setIsSavingCategory(true);
    try {
      const newCategory = await categoriesService.createCategory(user.uid, name);
      setUserCategories(prev => [...prev, newCategory]);
      setShowCreateCategory(false);
    } catch (error) {
      console.error('Failed to create category:', error);
      toast.error('Failed to create category');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const getSoundsByCategory = (sounds: CustomizableSound[], categoryId: string) => {
    return sounds.filter(sound => sound.categoryId === categoryId);
  };

  const handleDeleteCategory = async () => {
    if (!user || !categoryToDelete) return;
    
    setIsDeletingCategory(true);
    try {
      // Delete the category
      await categoriesService.deleteCategory(user.uid, categoryToDelete.id);
      
      // Update sounds to remove the category
      const updatedSounds = savedSounds.map(sound => {
        if (sound.categoryId === categoryToDelete.id) {
          const { categoryId, ...rest } = sound;
          return rest;
        }
        return sound;
      });
      
      setSavedSounds(updatedSounds);
      setUserCategories(prev => prev.filter(c => c.id !== categoryToDelete.id));
      setActiveMySoundsCategory('all');
      toast.success('Category deleted successfully');
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error('Failed to delete category');
    } finally {
      setIsDeletingCategory(false);
      setShowDeleteCategoryDialog(false);
      setCategoryToDelete(null);
    }
  };

  const handleEditCategory = async (name: string) => {
    if (!user || !categoryToEdit) return;
    
    try {
      const updatedCategory = await categoriesService.updateCategory(
        user.uid,
        categoryToEdit.id,
        name
      );
      
      setUserCategories(prev => 
        prev.map(c => c.id === categoryToEdit.id ? updatedCategory : c)
      );
      
      toast.success('Category updated successfully');
    } catch (error) {
      console.error('Failed to update category:', error);
      toast.error('Failed to update category');
    } finally {
      setShowEditCategoryModal(false);
      setCategoryToEdit(null);
    }
  };

  const getCategoryActions = (category: UserCategory): CategoryAction[] => {
    return [
      {
        id: 'edit',
        name: 'Edit Name',
        icon: <PencilIcon className="mr-2 h-4 w-4" />,
        onClick: () => {
          setCategoryToEdit(category);
          setShowEditCategoryModal(true);
        }
      },
      {
        id: 'delete',
        name: 'Delete Category',
        icon: <TrashIcon className="mr-2 h-4 w-4" />,
        onClick: () => {
          setCategoryToDelete(category);
          setShowDeleteCategoryDialog(true);
        },
        variant: "destructive"
      }
    ];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sound Library</CardTitle>
            <CardDescription className="mt-2">
              Browse and preview our collection of curated audio bites
            </CardDescription>
          </div>
          {user && (
            <div className="flex items-center space-x-2">
              <Switch
                id="my-sounds"
                checked={showMySounds}
                onCheckedChange={setShowMySounds}
              />
              <Label htmlFor="my-sounds">My Sounds</Label>
            </div>
          )}
        </div>
      </CardHeader>

      {showMySounds ? (
        <Tabs defaultValue="all" value={activeMySoundsCategory} onValueChange={setActiveMySoundsCategory}>
          <div className="border-b">
            <div className="px-6">
              <TabsList className="h-12 justify-start w-full rounded-xl bg-transparent p-0">
                <TabsTrigger
                  value="all"
                  className={cn(
                    "relative h-10 rounded-xl mb-2 px-4",
                    "transition-all duration-200",
                    "hover:bg-muted/50",
                    "data-[state=active]:bg-foreground",
                    "data-[state=active]:text-background",
                    "data-[state=active]:shadow-sm"
                  )}
                >
                  All Sounds
                </TabsTrigger>

                <div className="flex mb-2 items-center gap-2 ml-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-10 gap-1 rounded-xl",
                          activeMySoundsCategory !== 'all' && "bg-foreground text-background"
                        )}
                      >
                        {activeMySoundsCategory === 'all' 
                          ? "Categories" 
                          : userCategories.find(c => c.id === activeMySoundsCategory)?.name || "Categories"
                        }
                        <ChevronDownIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {userCategories.map((category) => (
                        <DropdownMenuItem
                          key={category.id}
                          className="flex items-center justify-between"
                          onSelect={(e) => {
                            e.preventDefault();
                            setActiveMySoundsCategory(category.id);
                          }}
                        >
                          <span>{category.name}</span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontalIcon className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {getCategoryActions(category).map((action) => (
                                <DropdownMenuItem
                                  key={action.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    action.onClick();
                                  }}
                                  className={cn(
                                    action.variant === "destructive" && "text-destructive"
                                  )}
                                >
                                  {action.icon}
                                  {action.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem
                        onClick={() => setShowCreateCategory(true)}
                        className="flex items-center"
                      >
                        <PlusCircleIcon className="mr-2 h-4 w-4" />
                        New Category
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TabsList>
            </div>
          </div>

          <CreateCategoryModal
            open={showCreateCategory}
            onOpenChange={setShowCreateCategory}
            onSave={handleCreateCategory}
            isSaving={isSavingCategory}
          />
          
          <TabsContent value="all" className="focus-visible:outline-none focus-visible:ring-0">
            <div className="px-6 pt-6 pb-8">
              <div className="grid grid-cols-1 gap-4">
                {savedSounds.length > 0 ? (
                  sortSoundsByCreationTime(savedSounds).map((sound) => (
                    <SoundItem
                      key={sound.id}
                      sound={sound}
                      onSelect={handleSoundSelect}
                      selected={selectedSoundId === sound.id}
                      onDelete={handleDeleteSound}
                      onEdit={handleEditLayers}
                      showDeleteButton={true}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    You haven't saved any sounds yet
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          {userCategories.map((category) => (
            <TabsContent 
              key={category.id} 
              value={category.id}
              className="focus-visible:outline-none focus-visible:ring-0"
            >
              <div className="px-6 pt-6 pb-8">
                <div className="grid grid-cols-1 gap-4">
                  {(() => {
                    const categorySounds = getSoundsByCategory(savedSounds, category.id);
                    return categorySounds.length > 0 ? (
                      sortSoundsByCreationTime(categorySounds).map((sound) => (
                        <SoundItem
                          key={sound.id}
                          sound={sound}
                          onSelect={handleSoundSelect}
                          selected={selectedSoundId === sound.id}
                          onDelete={handleDeleteSound}
                          onEdit={handleEditLayers}
                          showDeleteButton={true}
                        />
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No sounds in this category yet
                      </div>
                    );
                  })()}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <div className="border-b">
            <div className="px-6">
              <TabsList className="h-12 w-full rounded-xl bg-transparent p-0">
                {SOUND_CATEGORIES.map((category) => (
                  <TabsTrigger 
                    key={category.id} 
                    value={category.id}
                    className={cn(
                      "relative h-10 rounded-xl mb-2 px-4 mx-1", // Added mx-1 for horizontal padding between pills
                      "transition-all duration-200",
                      "hover:bg-muted/50", 
                      "data-[state=active]:bg-foreground",
                      "data-[state=active]:text-background",
                      "data-[state=active]:shadow-sm"
                    )}
                  >
                    {category.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>
          
          {SOUND_CATEGORIES.map((category) => (
            <TabsContent 
              key={category.id} 
              value={category.id} 
              className="focus-visible:outline-none focus-visible:ring-0"
            >
              <div className="px-6 pt-6 pb-8">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-foreground">{category.name}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{category.description}</p>
                </div>
                <SoundCategory 
                  category={category} 
                  onSoundSelect={onSoundSelect}
                  selectedSoundId={selectedSoundId}
                  isLoading={false}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      <AlertDialog 
        open={showDeleteCategoryDialog} 
        onOpenChange={setShowDeleteCategoryDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{categoryToDelete?.name}"? 
              Sounds in this category will be moved to uncategorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingCategory}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={isDeletingCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingCategory ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateCategoryModal
        open={showEditCategoryModal}
        onOpenChange={setShowEditCategoryModal}
        onSave={handleEditCategory}
        isSaving={false}
        defaultName={categoryToEdit?.name}
        title="Edit Category"
        description="Enter a new name for this category"
      />
    </Card>
  );
} 