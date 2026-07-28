import { getReact, useEffect, useRef, useState } from '../react';

const BUTTON_LABEL = 'Luminous settings';
const BUTTON_ICON: Spicetify.Icon = 'brightness';
const MODAL_ID = 'luminous-theme-modal';
const MODAL_TITLE_ID = 'luminous-theme-modal-title';
const MODAL_DESCRIPTION_ID = 'luminous-theme-modal-description';
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  '[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

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
  const previouslyOpen = ref(false);
  const [open, setOpen] = state(false);

  effect(() => {
    let disposed = false;
    let retryTimer: number | null = null;
    let recoveryTimer: number | null = null;

    const scheduleRetry = () => {
      if (disposed || retryTimer !== null) return;

      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        ensureButton();
      }, 250);
    };

    const ensureButton = () => {
      retryTimer = null;
      if (disposed) return;

      if (buttonRef.current?.element.isConnected) return;

      if (!Spicetify.Topbar?.Button) {
        scheduleRetry();
        return;
      }

      buttonRef.current?.element.remove();
      buttonRef.current = null;
      document
        .querySelectorAll('.luminous-theme-menu-button')
        .forEach((element) => element.remove());

      const button = new Spicetify.Topbar.Button(
        BUTTON_LABEL,
        BUTTON_ICON,
        () => setOpen((value) => !value),
        false,
        true,
      );

      button.element.classList.add('luminous-theme-menu-button');
      button.element.setAttribute('aria-haspopup', 'dialog');
      button.element.setAttribute('aria-expanded', String(open));
      button.element.setAttribute('aria-controls', MODAL_ID);
      button.element.classList.toggle(
        'luminous-theme-menu-button--active',
        open,
      );
      buttonRef.current = button;
    };

    ensureButton();
    recoveryTimer = window.setInterval(ensureButton, 1000);

    return () => {
      disposed = true;

      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }

      if (recoveryTimer !== null) {
        window.clearInterval(recoveryTimer);
      }

      buttonRef.current?.element.remove();
      buttonRef.current = null;
    };
  }, []);

  effect(() => {
    const button = buttonRef.current?.element;

    if (button) {
      button.setAttribute('aria-expanded', String(open));
      button.classList.toggle('luminous-theme-menu-button--active', open);
    }

    if (!open && previouslyOpen.current && button?.isConnected) {
      button.focus();
    }

    previouslyOpen.current = open;
  }, [open]);

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
  const [dynamicBackground, setDynamicBackground] = state(
    () => Luminous.Settings.get('dynamicBackground') !== false,
  );

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
    return Luminous.Settings.subscribe<boolean>(
      'dynamicBackground',
      (value) => setDynamicBackground(value !== false),
      { immediate: true },
    );
  }, []);

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
            'Personalise your Spotify experience',
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
      React.createElement(
        'p',
        { className: 'luminous-theme-menu__footer' },
        'Changes are saved automatically.',
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

function readNumericSetting(setting: NumericSetting): number {
  const current = Luminous.Settings.get(setting.key);
  const parsed = Number(current);

  if (!Number.isFinite(parsed)) {
    return setting.fallback;
  }

  return parsed;
}
