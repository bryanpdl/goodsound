export interface Sound {
  id: string;
  name: string;
  category: string;
  path: string;
  tags?: string[];
}

export interface SoundCategory {
  id: string;
  name: string;
  description: string;
  sounds: Sound[];
}

export const SOUND_CATEGORIES: SoundCategory[] = [
  {
    id: 'clicks',
    name: 'Clicks & Taps',
    description: 'Subtle interaction sounds for buttons and UI elements.',
    sounds: [
      {
        id: 'ui-click-1',
        name: 'UI Click',
        category: 'clicks',
        path: '/sounds/clicks/ui-click.mp3',
        tags: ['click', 'button', 'bright']
      },
      {
        id: 'bouncy-click',
        name: 'Bouncy',
        category: 'clicks',
        path: '/sounds/clicks/click-bouncy.mp3',
        tags: ['click', 'button', 'tap', 'organic']
      },
      {
        id: 'menu-click',
        name: 'Menu Tap',
        category: 'clicks',
        path: '/sounds/clicks/menu-click.mp3',
        tags: ['modern', 'menu', 'tap' ]
      },
      {
        id: 'wood-click',
        name: 'Wood',
        category: 'clicks',
        path: '/sounds/clicks/wood-click.mp3',
        tags: ['click', 'wood', 'short', 'natural']
      },
      {
        id: 'select-click',
        name: 'Select',
        category: 'clicks',
        path: '/sounds/clicks/select-click.mp3',
        tags: ['click', 'select', 'toggle' ]
      },
      {
        id: 'double-tap',
        name: 'Double Tap',
        category: 'clicks',
        path: '/sounds/clicks/double-tap.mp3',
        tags: ['analog', 'tap', 'short']
      }
    ]
  },
  {
    id: 'notifications',
    name: 'Notifications & Alerts',
    description: 'Attention-grabbing sounds for important updates.',
    sounds: [
      {
        id: 'synth-alert',
        name: 'Synth Alert',
        category: 'notifications',
        path: '/sounds/notifications/noti-synthalert.mp3',
        tags: ['notification', 'alert', 'synth', 'modern']
      },
      {
        id: 'synth-notification',
        name: 'Synth Notification',
        category: 'notifications',
        path: '/sounds/notifications/synth-notification.mp3',
        tags: ['notification', 'synth', 'modern']
      }
    ]
  },
  {
    id: 'transitions',
    name: 'Transitions',
    description: 'Smooth sounds for state changes and animations.',
    sounds: [
      {
        id: 'short-swipe1',
        name: 'Short Swipe 1',
        category: 'transitions',
        path: '/sounds/transitions/short-swipe1.mp3',
        tags: ['swipe', 'transition', 'navigation']
      },
      {
        id: 'scroll-up',
        name: 'Scroll Up',
        category: 'transitions',
        path: '/sounds/transitions/scroll-up.mp3',
        tags: ['scroll', 'transition', 'navigation']
      }
    ]
  },
  {
    id: 'feedback',
    name: 'Success & Error',
    description: 'Clear audio feedback for user actions.',
    sounds: [
      {
        id: 'alert-negative',
        name: 'Negative Alert',
        category: 'feedback',
        path: '/sounds/successAndError/alert-negative.mp3',
        tags: ['alert', 'error', 'negative']
      },
      {
        id: 'bright-alert',
        name: 'Bright Alert',
        category: 'feedback',
        path: '/sounds/successAndError/bright-alert.mp3',
        tags: ['alert', 'success', 'positive']
      }
    ]
  }
];

export interface SoundCustomizationSettings {
  volume: number;
  pitch: number;
  speed: number;
  duration: number;
}

export interface LayerData {
  sound: Sound;
  volume: number;
  delay: number;
}

export interface CustomizableSound extends Sound {
  category: string;
  layers?: LayerData[];
  categoryId?: string;
  customization?: SoundCustomizationSettings;
} 