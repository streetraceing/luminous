import { getReact, ReactRef, useEffect, useRef, useState } from '../react';

const BUTTON_LABEL = 'Luminous settings';
const BUTTON_ICON: Spicetify.Icon = 'brightness';

type NumericSetting = {
  key: string;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  unit: 'px' | '%' | '';
  fallback: number;
};

const numericSettings: NumericSetting[] = [
  {
    key: 'backgroundBlur',
    label: 'Background blur',
    description: 'Softens album art and canvas motion.',
    min: 0,
    max: 48,
    step: 1,
    unit: 'px',
    fallback: 24,
  },
  {
    key: 'backgroundBrightness',
    label: 'Background brightness',
    description: 'Controls the ambient backdrop intensity.',
    min: 30,
    max: 120,
    step: 1,
    unit: '%',
    fallback: 75,
  },
  {
    key: 'uiOpacity',
    label: 'UI opacity',
    description: 'Adjusts the glass surface strength.',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    fallback: 50,
  },
];

const resettableSettings = [
  'dynamicBackground',
  ...numericSettings.map((setting) => setting.key),
];

export function ThemeMenuFeature() {
  const React = getReact();
  const effect = useEffect();
  const ref = useRef();
  const state = useState();

  const buttonRef = ref<Spicetify.Topbar.Button | null>(null);
  const menuRef = ref<HTMLDivElement | null>(null);
  const [open, setOpen] = state(false);

  effect(() => {
    let disposed = false;
    let retryTimer: number | null = null;

    const createButton = () => {
      retryTimer = null;
      if (disposed) return;

      if (!Spicetify.Topbar?.Button) {
        retryTimer = window.setTimeout(createButton, 250);
        return;
      }

      const button = new Spicetify.Topbar.Button(
        BUTTON_LABEL,
        BUTTON_ICON,
        () => setOpen((value) => !value),
        false,
        true,
      );

      button.element.classList.add('luminous-theme-menu-button');
      buttonRef.current = button;
    };

    createButton();

    return () => {
      disposed = true;

      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }

      buttonRef.current?.element.remove();
      buttonRef.current = null;
    };
  }, []);

  effect(() => {
    if (!open) return;

    const handleOutsideInteraction = (event: PointerEvent | MouseEvent) => {
      const path = event.composedPath();
      const button = buttonRef.current?.element;
      const menu = menuRef.current;

      if ((button && path.includes(button)) || (menu && path.includes(menu))) {
        return;
      }

      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsideInteraction, true);
    document.addEventListener('click', handleOutsideInteraction, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener(
        'pointerdown',
        handleOutsideInteraction,
        true,
      );
      document.removeEventListener('click', handleOutsideInteraction, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open]);

  if (!open) return null;

  return React.createElement(ThemeMenuPopover, {
    anchor: buttonRef.current?.element ?? null,
    menuRef,
    onClose: () => setOpen(false),
  });
}

function ThemeMenuPopover({
  anchor,
  menuRef,
  onClose,
}: {
  anchor: HTMLElement | null;
  menuRef: ReactRef<HTMLDivElement | null>;
  onClose: () => void;
}) {
  const React = getReact();
  const effect = useEffect();
  const state = useState();
  const [position, setPosition] = state(() => getMenuPosition(anchor));
  const [dynamicBackground, setDynamicBackground] = state(
    () => Luminous.Settings.get('dynamicBackground') !== false,
  );

  effect(() => {
    const syncPosition = () => setPosition(getMenuPosition(anchor));

    syncPosition();
    window.addEventListener('resize', syncPosition);
    window.addEventListener('scroll', syncPosition, true);

    return () => {
      window.removeEventListener('resize', syncPosition);
      window.removeEventListener('scroll', syncPosition, true);
    };
  }, [anchor]);

  effect(() => {
    return Luminous.Settings.subscribe<boolean>(
      'dynamicBackground',
      (value) => setDynamicBackground(value !== false),
      { immediate: true },
    );
  }, []);

  return React.createElement(
    'div',
    {
      ref: menuRef,
      className: 'luminous-theme-menu',
      style: {
        top: `${position.top}px`,
        right: `${position.right}px`,
      },
      role: 'dialog',
      'aria-label': 'Luminous settings',
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
            __html: Spicetify.SVGIcons['brightness'],
          },
        }),
      ),
      React.createElement(
        'div',
        { className: 'luminous-theme-menu__title' },
        React.createElement('span', null, 'Luminous'),
        React.createElement('small', null, 'Theme settings'),
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
          className: 'luminous-theme-menu__icon-button',
          type: 'button',
          'aria-label': 'Close',
          onClick: onClose,
        },
        React.createElement('svg', {
          className: 'luminous-theme-menu__close-icon',
          dangerouslySetInnerHTML: {
            __html: Spicetify.SVGIcons['x'],
          },
        }),
      ),
    ),
    React.createElement(
      'div',
      { className: 'luminous-theme-menu__section' },
      React.createElement(
        'div',
        { className: 'luminous-theme-menu__section-header' },
        'Appearance',
      ),
      React.createElement(ToggleRow, {
        label: 'Dynamic background',
        description: 'Use the current cover or Spotify Canvas as backdrop.',
        checked: dynamicBackground,
        onChange: (checked: boolean) =>
          Luminous.Settings.set('dynamicBackground', checked),
      }),
      numericSettings.map((setting) =>
        React.createElement(NumericSettingRow, {
          key: setting.key,
          setting,
        }),
      ),
    ),
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const React = getReact();

  return React.createElement(
    'label',
    { className: 'luminous-theme-menu__row luminous-theme-menu__toggle' },
    React.createElement(
      'span',
      { className: 'luminous-theme-menu__copy' },
      React.createElement('span', null, label),
      React.createElement('small', null, description),
    ),
    React.createElement(
      'span',
      { className: 'luminous-theme-menu__switch' },
      React.createElement('input', {
        type: 'checkbox',
        checked,
        onChange: (event: Event) =>
          onChange((event.currentTarget as HTMLInputElement).checked),
      }),
      React.createElement('span'),
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
      React.createElement(
        'strong',
        null,
        setting.unit === '%' || setting.unit === 'px'
          ? `${value}${setting.unit}`
          : value,
      ),
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

function getMenuPosition(anchor: HTMLElement | null) {
  if (!anchor) {
    return { top: 64, right: 16 };
  }

  const rect = anchor.getBoundingClientRect();
  return {
    top: Math.round(rect.bottom + 8),
    right: Math.max(12, Math.round(window.innerWidth - rect.right)),
  };
}

function readNumericSetting(setting: NumericSetting): number {
  const current = Luminous.Settings.get(setting.key);
  const parsed = Number(current);

  if (Number.isNaN(parsed)) {
    return setting.fallback;
  }

  return parsed;
}
