import { getReact, useEffect, useRef, useState } from '../react';

const MENU_ITEM_LABEL = 'Luminous Settings';
const MENU_ITEM_ICON: Spicetify.Icon = 'brightness';
const MODAL_ID = 'luminous-theme-modal';
const MODAL_TITLE_ID = 'luminous-theme-modal-title';
const MODAL_DESCRIPTION_ID = 'luminous-theme-modal-description';
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  '[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type ThemeTab = 'appearance' | 'motion';

type NumericSetting = {
  key: string;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  unit: 'px' | '%' | 's';
  fallback: number;
};

type ToggleSetting = {
  key: string;
  label: string;
  description: string;
  fallback: boolean;
};

type ChoiceSetting = {
  key: string;
  label: string;
  description: string;
  fallback: string;
  options: Array<{
    value: string;
    label: string;
  }>;
};

const tabs: Array<{ id: ThemeTab; label: string }> = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'motion', label: 'Motion' },
];

const appearanceToggles: ToggleSetting[] = [
  {
    key: 'dynamicBackground',
    label: 'Dynamic background',
    description: 'Use the current cover or Spotify Canvas as the backdrop.',
    fallback: true,
  },
  {
    key: 'dynamicPalette',
    label: 'Dynamic palette',
    description: 'Tint Luminous with colours extracted from the current cover.',
    fallback: true,
  },
];

const appearanceNumericSettings: NumericSetting[] = [
  {
    key: 'backgroundBlur',
    label: 'Background blur',
    description: 'Softens album art and Canvas motion behind the interface.',
    min: 0,
    max: 48,
    step: 1,
    unit: 'px',
    fallback: 24,
  },
  {
    key: 'backgroundBrightness',
    label: 'Background brightness',
    description: 'Controls how prominent the artwork remains behind Spotify.',
    min: 30,
    max: 120,
    step: 1,
    unit: '%',
    fallback: 75,
  },
  {
    key: 'uiOpacity',
    label: 'Surface opacity',
    description: 'Sets the density of the translucent interface surfaces.',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    fallback: 50,
  },
  {
    key: 'uiBlur',
    label: 'Surface blur',
    description:
      'Controls the blur applied to navigation and content surfaces.',
    min: 0,
    max: 32,
    step: 1,
    unit: 'px',
    fallback: 16,
  },
  {
    key: 'paletteStrength',
    label: 'Palette strength',
    description: 'Adjusts how much the cover colours tint the interface.',
    min: 0,
    max: 45,
    step: 1,
    unit: '%',
    fallback: 24,
  },
];

const motionChoiceSetting: ChoiceSetting = {
  key: 'backgroundMotion',
  label: 'Background movement',
  description: 'Choose a subtle movement for the active artwork or Canvas.',
  fallback: 'drift',
  options: [
    { value: 'still', label: 'Still' },
    { value: 'drift', label: 'Drift' },
    { value: 'float', label: 'Float' },
  ],
};

const motionNumericSettings: NumericSetting[] = [
  {
    key: 'motionDuration',
    label: 'Motion speed',
    description: 'Sets the duration of one background movement cycle.',
    min: 8,
    max: 48,
    step: 1,
    unit: 's',
    fallback: 20,
  },
];

const motionToggles: ToggleSetting[] = [
  {
    key: 'reduceMotion',
    label: 'Reduce motion',
    description: 'Stop Luminous animations and background cross-fades.',
    fallback: false,
  },
];

const resettableSettings = [
  ...appearanceToggles.map((setting) => setting.key),
  ...appearanceNumericSettings.map((setting) => setting.key),
  motionChoiceSetting.key,
  ...motionNumericSettings.map((setting) => setting.key),
  ...motionToggles.map((setting) => setting.key),
];

export function ThemeMenuFeature() {
  const React = getReact();
  const effect = useEffect();
  const ref = useRef();
  const state = useState();

  const menuItemRef = ref<Spicetify.Menu.Item | null>(null);
  const [open, setOpen] = state(false);

  effect(() => {
    let disposed = false;
    let retryTimer: number | null = null;

    const scheduleRetry = () => {
      if (disposed || retryTimer !== null) return;

      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        registerMenuItem();
      }, 250);
    };

    const registerMenuItem = () => {
      retryTimer = null;
      if (disposed || menuItemRef.current) return;

      if (!Spicetify.Menu?.Item) {
        scheduleRetry();
        return;
      }

      const menuItem = new Spicetify.Menu.Item(
        MENU_ITEM_LABEL,
        false,
        () => setOpen(true),
        MENU_ITEM_ICON,
      );

      menuItem.register();
      menuItemRef.current = menuItem;
    };

    registerMenuItem();

    return () => {
      disposed = true;

      if (retryTimer !== null) window.clearTimeout(retryTimer);

      menuItemRef.current?.deregister();
      menuItemRef.current = null;
    };
  }, []);

  if (!open) return null;

  return React.createElement(ThemeSettingsModal, {
    onClose: () => setOpen(false),
  });
}

function ThemeSettingsModal({ onClose }: { onClose: () => void }) {
  const React = getReact();
  const effect = useEffect();
  const ref = useRef();
  const state = useState();
  const dialogRef = ref<HTMLDivElement | null>(null);
  const closeButtonRef = ref<HTMLButtonElement | null>(null);
  const tabButtonRefs = ref<Record<ThemeTab, HTMLButtonElement | null>>({
    appearance: null,
    motion: null,
  });
  const panelRef = ref<HTMLDivElement | null>(null);
  const panelContentRef = ref<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = state<ThemeTab>('appearance');
  const [panelHeight, setPanelHeight] = state<number | null>(null);

  const selectTab = (tab: ThemeTab, focus = false) => {
    if (tab === activeTab) return;

    const currentHeight = panelRef.current?.getBoundingClientRect().height;
    if (currentHeight) {
      setPanelHeight(Math.ceil(currentHeight));
    }

    setActiveTab(tab);

    if (focus) {
      requestAnimationFrame(() => tabButtonRefs.current[tab]?.focus());
    }
  };

  effect(() => {
    const previousOverflow = document.body.style.overflow;
    const focusFrame = requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    document.body.style.overflow = 'hidden';

    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  effect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ??
          [],
      );

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onClose]);

  effect(() => {
    if (panelHeight === null || !panelContentRef.current) return;

    const targetHeight = Math.ceil(
      panelContentRef.current.getBoundingClientRect().height,
    );
    const frameId = requestAnimationFrame(() => {
      setPanelHeight(targetHeight);
    });
    const resetTimer = window.setTimeout(() => {
      setPanelHeight(null);
    }, 220);

    return () => {
      cancelAnimationFrame(frameId);
      window.clearTimeout(resetTimer);
    };
  }, [activeTab]);

  const handleTabKeyDown = (event: KeyboardEvent, tab: ThemeTab) => {
    const currentIndex = tabs.findIndex((item) => item.id === tab);
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight')
      nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    }
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    selectTab(tabs[nextIndex].id, true);
  };

  return React.createElement(
    'div',
    {
      className: 'luminous-theme-modal-backdrop',
      onMouseDown: (event: MouseEvent) => {
        if (event.target === event.currentTarget) onClose();
      },
    },
    React.createElement(
      'div',
      {
        ref: dialogRef,
        id: MODAL_ID,
        className: 'luminous-theme-menu',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': MODAL_TITLE_ID,
        'aria-describedby': MODAL_DESCRIPTION_ID,
      },
      React.createElement(
        'div',
        { className: 'luminous-theme-menu__header' },
        React.createElement(
          'div',
          { className: 'luminous-theme-menu__mark' },
          React.createElement('svg', {
            className: 'luminous-theme-menu__luminous-icon',
            viewBox: '0 0 16 16',
            'aria-hidden': 'true',
            focusable: 'false',
            dangerouslySetInnerHTML: {
              __html: Spicetify.SVGIcons?.brightness ?? '',
            },
          }),
        ),
        React.createElement(
          'div',
          { className: 'luminous-theme-menu__title' },
          React.createElement('span', { id: MODAL_TITLE_ID }, 'Luminous'),
          React.createElement(
            'small',
            { id: MODAL_DESCRIPTION_ID },
            'Theme preferences',
          ),
        ),
        React.createElement(
          'button',
          {
            className: 'luminous-theme-menu__reset-button',
            type: 'button',
            onClick: () => Luminous.Settings.resetMany(resettableSettings),
          },
          'Reset',
        ),
        React.createElement(
          'button',
          {
            ref: closeButtonRef,
            className: 'luminous-theme-menu__icon-button',
            type: 'button',
            'aria-label': 'Close settings',
            onClick: onClose,
          },
          React.createElement('svg', {
            className: 'luminous-theme-menu__close-icon',
            'aria-hidden': 'true',
            dangerouslySetInnerHTML: {
              __html: Spicetify.SVGIcons?.x ?? '',
            },
          }),
        ),
      ),
      React.createElement(
        'div',
        {
          className: 'luminous-theme-menu__tabs',
          role: 'tablist',
          'aria-label': 'Luminous settings sections',
        },
        tabs.map((tab) =>
          React.createElement(
            'button',
            {
              key: tab.id,
              ref: (element: HTMLButtonElement | null) => {
                tabButtonRefs.current[tab.id] = element;
              },
              id: `${MODAL_ID}-${tab.id}-tab`,
              className: `luminous-theme-menu__tab${
                activeTab === tab.id ? ' luminous-theme-menu__tab--active' : ''
              }`,
              type: 'button',
              role: 'tab',
              tabIndex: activeTab === tab.id ? 0 : -1,
              'aria-selected': String(activeTab === tab.id),
              'aria-controls': `${MODAL_ID}-${tab.id}-panel`,
              onClick: () => selectTab(tab.id),
              onKeyDown: (event: KeyboardEvent) =>
                handleTabKeyDown(event, tab.id),
            },
            tab.label,
          ),
        ),
      ),
      React.createElement(
        'div',
        {
          ref: panelRef,
          id: `${MODAL_ID}-${activeTab}-panel`,
          className: 'luminous-theme-menu__panel',
          style:
            panelHeight === null ? undefined : { height: `${panelHeight}px` },
          role: 'tabpanel',
          'aria-labelledby': `${MODAL_ID}-${activeTab}-tab`,
        },
        React.createElement(
          'div',
          {
            key: activeTab,
            ref: panelContentRef,
            className: 'luminous-theme-menu__panel-content',
          },
          activeTab === 'appearance'
            ? React.createElement(AppearanceSettings)
            : React.createElement(MotionSettings),
        ),
      ),
      React.createElement(
        'p',
        { className: 'luminous-theme-menu__footer' },
        'Changes are saved automatically.',
      ),
    ),
  );
}

function AppearanceSettings() {
  const React = getReact();

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      'div',
      { className: 'luminous-theme-menu__panel-heading' },
      React.createElement('h2', null, 'Appearance'),
      React.createElement(
        'p',
        null,
        'Shape the balance between artwork, colour, and Spotify surfaces.',
      ),
    ),
    appearanceToggles.map((setting) =>
      React.createElement(ToggleSettingRow, {
        key: setting.key,
        setting,
      }),
    ),
    appearanceNumericSettings.map((setting) =>
      React.createElement(NumericSettingRow, {
        key: setting.key,
        setting,
      }),
    ),
  );
}

function MotionSettings() {
  const React = getReact();

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      'div',
      { className: 'luminous-theme-menu__panel-heading' },
      React.createElement('h2', null, 'Motion'),
      React.createElement(
        'p',
        null,
        'Keep the background still or add a measured, low-impact movement.',
      ),
    ),
    React.createElement(ChoiceSettingRow, { setting: motionChoiceSetting }),
    motionNumericSettings.map((setting) =>
      React.createElement(NumericSettingRow, {
        key: setting.key,
        setting,
      }),
    ),
    motionToggles.map((setting) =>
      React.createElement(ToggleSettingRow, {
        key: setting.key,
        setting,
      }),
    ),
  );
}

function ToggleSettingRow({ setting }: { setting: ToggleSetting }) {
  const React = getReact();
  const effect = useEffect();
  const state = useState();
  const [checked, setChecked] = state(() =>
    readBooleanSetting(setting.key, setting.fallback),
  );

  effect(() => {
    return Luminous.Settings.subscribe<boolean>(
      setting.key,
      (value) => setChecked(value === true),
      { immediate: true },
    );
  }, [setting.key]);

  return React.createElement(
    'label',
    { className: 'luminous-theme-menu__row luminous-theme-menu__toggle' },
    React.createElement(
      'span',
      { className: 'luminous-theme-menu__copy' },
      React.createElement('span', null, setting.label),
      React.createElement('small', null, setting.description),
    ),
    React.createElement(
      'span',
      { className: 'luminous-theme-menu__toggle-control' },
      setting.key === 'dynamicPalette' &&
        React.createElement(
          'span',
          {
            className: 'luminous-theme-menu__palette-preview',
            'aria-hidden': 'true',
          },
          React.createElement('i'),
          React.createElement('i'),
          React.createElement('i'),
        ),
      React.createElement(
        'span',
        { className: 'luminous-theme-menu__switch' },
        React.createElement('input', {
          type: 'checkbox',
          checked,
          onChange: (event: Event) =>
            Luminous.Settings.set(
              setting.key,
              (event.currentTarget as HTMLInputElement).checked,
            ),
        }),
        React.createElement('span'),
      ),
    ),
  );
}

function NumericSettingRow({ setting }: { setting: NumericSetting }) {
  const React = getReact();
  const effect = useEffect();
  const state = useState();
  const [value, setValue] = state(() => readNumericSetting(setting));

  effect(() => {
    return Luminous.Settings.subscribe<number>(
      setting.key,
      (nextValue) => setValue(Number(nextValue)),
      { immediate: true },
    );
  }, [setting.key]);

  return React.createElement(
    'label',
    { className: 'luminous-theme-menu__row luminous-theme-menu__range' },
    React.createElement(
      'span',
      { className: 'luminous-theme-menu__range-header' },
      React.createElement(
        'span',
        { className: 'luminous-theme-menu__copy' },
        React.createElement('span', null, setting.label),
        React.createElement('small', null, setting.description),
      ),
      React.createElement('strong', null, `${value}${setting.unit}`),
    ),
    React.createElement(
      'span',
      { className: 'luminous-theme-menu__range-control' },
      React.createElement('input', {
        type: 'range',
        min: setting.min,
        max: setting.max,
        step: setting.step,
        value,
        onChange: (event: Event) =>
          Luminous.Settings.set(
            setting.key,
            Number((event.currentTarget as HTMLInputElement).value),
          ),
      }),
    ),
  );
}

function ChoiceSettingRow({ setting }: { setting: ChoiceSetting }) {
  const React = getReact();
  const effect = useEffect();
  const state = useState();
  const [value, setValue] = state(() =>
    readStringSetting(setting.key, setting.fallback),
  );

  effect(() => {
    return Luminous.Settings.subscribe<string>(
      setting.key,
      (nextValue) => setValue(String(nextValue)),
      { immediate: true },
    );
  }, [setting.key]);

  return React.createElement(
    'div',
    { className: 'luminous-theme-menu__row luminous-theme-menu__choice' },
    React.createElement(
      'div',
      { className: 'luminous-theme-menu__copy' },
      React.createElement('span', null, setting.label),
      React.createElement('small', null, setting.description),
    ),
    React.createElement(
      'div',
      {
        className: 'luminous-theme-menu__choices',
        role: 'group',
        'aria-label': setting.label,
      },
      setting.options.map((option) =>
        React.createElement(
          'button',
          {
            key: option.value,
            className: `luminous-theme-menu__choice-button${
              value === option.value
                ? ' luminous-theme-menu__choice-button--active'
                : ''
            }`,
            type: 'button',
            'aria-pressed': String(value === option.value),
            onClick: () => Luminous.Settings.set(setting.key, option.value),
          },
          option.label,
        ),
      ),
    ),
  );
}

function readNumericSetting(setting: NumericSetting): number {
  const current = Luminous.Settings.get(setting.key);
  const parsed = Number(current);

  return Number.isFinite(parsed) ? parsed : setting.fallback;
}

function readBooleanSetting(key: string, fallback: boolean): boolean {
  const current = Luminous.Settings.get(key);
  return typeof current === 'boolean' ? current : fallback;
}

function readStringSetting(key: string, fallback: string): string {
  const current = Luminous.Settings.get(key);
  return typeof current === 'string' ? current : fallback;
}
