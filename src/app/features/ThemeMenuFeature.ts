import {
  SettingUiDefinition,
  settingsUi,
  visualPresets,
} from '../../config/settings';
import type { SettingValue } from '../../types/runtime/settings.types';
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

type ThemeTab = 'appearance' | 'motion' | 'advanced';

const tabs: ReadonlyArray<{ id: ThemeTab; label: string }> = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'motion', label: 'Motion' },
  { id: 'advanced', label: 'Advanced' },
];

const resettableSettings = settingsUi.map((setting) => setting.key);

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

    const registerMenuItem = () => {
      retryTimer = null;
      if (disposed || menuItemRef.current) return;

      if (!Spicetify.Menu?.Item) {
        retryTimer = window.setTimeout(registerMenuItem, 250);
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
    advanced: null,
  });
  const panelRef = ref<HTMLDivElement | null>(null);
  const panelContentRef = ref<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = state<ThemeTab>('appearance');
  const [panelHeight, setPanelHeight] = state<number | null>(null);

  const selectTab = (tab: ThemeTab, focus = false) => {
    if (tab === activeTab) return;

    const currentHeight = panelRef.current?.getBoundingClientRect().height;
    if (currentHeight) setPanelHeight(Math.ceil(currentHeight));

    setActiveTab(tab);
    if (focus) requestAnimationFrame(() => tabButtonRefs.current[tab]?.focus());
  };

  effect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusFrame = requestAnimationFrame(() =>
      closeButtonRef.current?.focus(),
    );
    document.body.style.overflow = 'hidden';

    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
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
      ).filter((element) => element.offsetParent !== null);

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  effect(() => {
    if (panelHeight === null || !panelContentRef.current) return;

    const targetHeight = Math.ceil(
      panelContentRef.current.getBoundingClientRect().height,
    );
    const frameId = requestAnimationFrame(() => setPanelHeight(targetHeight));
    const resetTimer = window.setTimeout(() => setPanelHeight(null), 240);

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
            `Theme preferences · v${Luminous.version}`,
          ),
        ),
        React.createElement(
          'button',
          {
            className: 'luminous-theme-menu__reset-button',
            type: 'button',
            onClick: () => {
              Luminous.Settings.resetMany(resettableSettings);
              Spicetify.showNotification('Luminous settings reset');
            },
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
            dangerouslySetInnerHTML: { __html: Spicetify.SVGIcons?.x ?? '' },
          }),
        ),
      ),
      React.createElement(PresetStrip),
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
          React.createElement(SettingsSection, { section: activeTab }),
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

function PresetStrip() {
  const React = getReact();

  return React.createElement(
    'div',
    {
      className: 'luminous-theme-menu__presets',
      'aria-label': 'Visual presets',
    },
    React.createElement('span', null, 'Presets'),
    React.createElement(
      'div',
      { className: 'luminous-theme-menu__preset-list' },
      visualPresets.map((preset) =>
        React.createElement(
          'button',
          {
            key: preset.id,
            type: 'button',
            className: 'luminous-theme-menu__preset-button',
            title: preset.description,
            onClick: () => {
              Luminous.Settings.setMany(
                preset.values as Record<string, SettingValue>,
              );
              Spicetify.showNotification(`Luminous preset: ${preset.label}`);
            },
          },
          preset.label,
        ),
      ),
    ),
  );
}

function SettingsSection({ section }: { section: ThemeTab }) {
  const React = getReact();
  const headings: Record<ThemeTab, { title: string; description: string }> = {
    appearance: {
      title: 'Appearance',
      description:
        'Shape artwork, adaptive colour, and Spotify glass surfaces.',
    },
    motion: {
      title: 'Motion',
      description:
        'Tune movement, transitions, pointer depth, and accessibility.',
    },
    advanced: {
      title: 'Advanced',
      description: 'Control rendering cost and inspect the current runtime.',
    },
  };
  const heading = headings[section];
  const rows = settingsUi.filter((setting) => setting.section === section);

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      'div',
      { className: 'luminous-theme-menu__panel-heading' },
      React.createElement('h2', null, heading.title),
      React.createElement('p', null, heading.description),
    ),
    rows.map((setting) =>
      React.createElement(SettingRow, { key: setting.key, setting }),
    ),
    section === 'advanced' && React.createElement(RuntimeTools),
  );
}

function SettingRow({ setting }: { setting: SettingUiDefinition }) {
  if (setting.control === 'toggle') {
    return getReact().createElement(ToggleSettingRow, { setting });
  }

  if (setting.control === 'range') {
    return getReact().createElement(NumericSettingRow, { setting });
  }

  return getReact().createElement(ChoiceSettingRow, { setting });
}

function ToggleSettingRow({ setting }: { setting: SettingUiDefinition }) {
  const React = getReact();
  const effect = useEffect();
  const state = useState();
  const [checked, setChecked] = state(
    () => Luminous.Settings.get<boolean>(setting.key) === true,
  );

  effect(
    () =>
      Luminous.Settings.subscribe<boolean>(
        setting.key,
        (value) => setChecked(value === true),
        { immediate: true },
      ),
    [setting.key],
  );

  return React.createElement(
    'label',
    { className: 'luminous-theme-menu__row luminous-theme-menu__toggle' },
    React.createElement(SettingCopy, { setting }),
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
  );
}

function NumericSettingRow({ setting }: { setting: SettingUiDefinition }) {
  const React = getReact();
  const effect = useEffect();
  const state = useState();
  const [value, setValue] = state(() =>
    Number(Luminous.Settings.get<number>(setting.key)),
  );

  effect(
    () =>
      Luminous.Settings.subscribe<number>(
        setting.key,
        (nextValue) => setValue(Number(nextValue)),
        { immediate: true },
      ),
    [setting.key],
  );

  return React.createElement(
    'label',
    { className: 'luminous-theme-menu__row luminous-theme-menu__range' },
    React.createElement(
      'span',
      { className: 'luminous-theme-menu__range-header' },
      React.createElement(SettingCopy, { setting }),
      React.createElement('strong', null, `${value}${setting.unit ?? ''}`),
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

function ChoiceSettingRow({ setting }: { setting: SettingUiDefinition }) {
  const React = getReact();
  const effect = useEffect();
  const state = useState();
  const [value, setValue] = state(() =>
    String(Luminous.Settings.get<string>(setting.key)),
  );

  effect(
    () =>
      Luminous.Settings.subscribe<string>(
        setting.key,
        (nextValue) => setValue(String(nextValue)),
        { immediate: true },
      ),
    [setting.key],
  );

  return React.createElement(
    'div',
    { className: 'luminous-theme-menu__row luminous-theme-menu__choice' },
    React.createElement(SettingCopy, { setting }),
    React.createElement(
      'div',
      {
        className: 'luminous-theme-menu__choices',
        role: 'group',
        'aria-label': setting.label,
      },
      setting.options?.map((option) =>
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

function SettingCopy({ setting }: { setting: SettingUiDefinition }) {
  const React = getReact();
  return React.createElement(
    'span',
    { className: 'luminous-theme-menu__copy' },
    React.createElement('span', null, setting.label),
    React.createElement('small', null, setting.description),
  );
}

function RuntimeTools() {
  const React = getReact();
  const effect = useEffect();
  const state = useState();
  const [summary, setSummary] = state(() => getRuntimeSummary());

  effect(() => {
    const refresh = () => setSummary(getRuntimeSummary());
    Luminous.Background.addEventListener('change', refresh);
    Luminous.Canvas.addEventListener('mount', refresh);
    Luminous.Canvas.addEventListener('change', refresh);
    Luminous.Canvas.addEventListener('unmount', refresh);
    Luminous.Song.addEventListener('change', refresh);

    return () => {
      Luminous.Background.removeEventListener('change', refresh);
      Luminous.Canvas.removeEventListener('mount', refresh);
      Luminous.Canvas.removeEventListener('change', refresh);
      Luminous.Canvas.removeEventListener('unmount', refresh);
      Luminous.Song.removeEventListener('change', refresh);
    };
  }, []);

  return React.createElement(
    'div',
    { className: 'luminous-theme-menu__runtime' },
    React.createElement(
      'div',
      { className: 'luminous-theme-menu__runtime-copy' },
      React.createElement('strong', null, 'Runtime'),
      React.createElement('small', null, summary),
    ),
    React.createElement(
      'button',
      {
        type: 'button',
        className: 'luminous-theme-menu__tool-button',
        onClick: async () => {
          const copied = await Luminous.Diagnostics.copy();
          Spicetify.showNotification(
            copied
              ? 'Luminous diagnostics copied'
              : 'Could not copy diagnostics',
            !copied,
          );
        },
      },
      'Copy diagnostics',
    ),
  );
}

function getRuntimeSummary(): string {
  const diagnostics = Luminous.Diagnostics.get();
  const canvas = diagnostics.runtime.canvasMode ?? 'none';
  return `Background: ${diagnostics.runtime.background} · Canvas: ${canvas} · UI: ${diagnostics.runtime.uiHealth}`;
}
