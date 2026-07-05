import type {
  useEffect as ReactUseEffect,
  useRef as ReactUseRef,
  useState as ReactUseState,
} from "react";

const BUTTON_LABEL = "Luminous settings";
const BUTTON_ICON: Spicetify.Icon = "brightness";

type NumericSetting = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: "px" | "%" | "";
  fallback: number;
};

const numericSettings: NumericSetting[] = [
  {
    key: "backgroundBlur",
    label: "Background blur",
    min: 0,
    max: 48,
    step: 1,
    unit: "px",
    fallback: 24,
  },
  {
    key: "backgroundBrightness",
    label: "Background brightness",
    min: 30,
    max: 120,
    step: 1,
    unit: "%",
    fallback: 75,
  },
  {
    key: "uiOpacity",
    label: "UI opacity",
    min: 0,
    max: 100,
    step: 1,
    unit: "%",
    fallback: 50,
  },
];

const resettableSettings = [
  "dynamicBackground",
  ...numericSettings.map((setting) => setting.key),
];

const useEffect = () =>
  Spicetify.React.useEffect as typeof ReactUseEffect;
const useRef = () => Spicetify.React.useRef as typeof ReactUseRef;
const useState = () => Spicetify.React.useState as typeof ReactUseState;

export function ThemeMenuFeature() {
  const React = Spicetify.React;
  const effect = useEffect();
  const ref = useRef();
  const state = useState();

  const buttonRef = ref<Spicetify.Topbar.Button | null>(null);
  const menuRef = ref<HTMLDivElement | null>(null);
  const [open, setOpen] = state(false);

  effect(() => {
    let disposed = false;
    let rafId: number | null = null;

    const createButton = () => {
      if (disposed) return;

      if (!Spicetify.Topbar?.Button) {
        rafId = requestAnimationFrame(createButton);
        return;
      }

      const button = new Spicetify.Topbar.Button(
        BUTTON_LABEL,
        BUTTON_ICON,
        () => setOpen((value) => !value),
        false,
        true,
      );

      button.element.classList.add("luminous-theme-menu-button");
      buttonRef.current = button;
    };

    createButton();

    return () => {
      disposed = true;

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      buttonRef.current?.element.remove();
      buttonRef.current = null;
    };
  }, []);

  effect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const path = event.composedPath();
      const button = buttonRef.current?.element;
      const menu = menuRef.current;

      if (
        (button && path.includes(button)) ||
        (menu && path.includes(menu))
      ) {
        return;
      }

      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
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
  menuRef: React.MutableRefObject<HTMLDivElement | null>;
  onClose: () => void;
}) {
  const React = Spicetify.React;
  const effect = useEffect();
  const state = useState();
  const [position, setPosition] = state(() => getMenuPosition(anchor));
  const [dynamicBackground, setDynamicBackground] = state(
    () => Luminous.Settings.get("dynamicBackground") !== false,
  );

  effect(() => {
    const syncPosition = () => setPosition(getMenuPosition(anchor));

    syncPosition();
    window.addEventListener("resize", syncPosition);
    window.addEventListener("scroll", syncPosition, true);

    return () => {
      window.removeEventListener("resize", syncPosition);
      window.removeEventListener("scroll", syncPosition, true);
    };
  }, [anchor]);

  effect(() => {
    return Luminous.Settings.subscribe<boolean>(
      "dynamicBackground",
      (value) => setDynamicBackground(value !== false),
      { immediate: true },
    );
  }, []);

  return React.createElement(
    "div",
    {
      ref: menuRef,
      className: "luminous-theme-menu",
      style: {
        top: `${position.top}px`,
        right: `${position.right}px`,
      },
      role: "dialog",
      "aria-label": "Luminous settings",
    },
    React.createElement(
      "div",
      { className: "luminous-theme-menu__header" },
      React.createElement(
        "div",
        { className: "luminous-theme-menu__title" },
        React.createElement("span", null, "Luminous"),
        React.createElement("small", null, "Theme settings"),
      ),
      React.createElement(
        "button",
        {
          className: "luminous-theme-menu__reset-button",
          type: "button",
          onClick: () => Luminous.Settings.resetMany(resettableSettings),
        },
        "Reset",
      ),
      React.createElement(
        "button",
        {
          className: "luminous-theme-menu__icon-button",
          type: "button",
          "aria-label": "Close",
          onClick: onClose,
        },
        "x",
      ),
    ),
    React.createElement(
      "div",
      { className: "luminous-theme-menu__section" },
      React.createElement(ToggleRow, {
        label: "Dynamic background",
        checked: dynamicBackground,
        onChange: (checked: boolean) =>
          Luminous.Settings.set("dynamicBackground", checked),
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
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const React = Spicetify.React;

  return React.createElement(
    "label",
    { className: "luminous-theme-menu__row luminous-theme-menu__toggle" },
    React.createElement("span", null, label),
    React.createElement(
      "span",
      { className: "luminous-theme-menu__switch" },
      React.createElement("input", {
        type: "checkbox",
        checked,
        onChange: (event: Event) =>
          onChange((event.currentTarget as HTMLInputElement).checked),
      }),
      React.createElement("span"),
    ),
  );
}

function NumericSettingRow({ setting }: { setting: NumericSetting }) {
  const React = Spicetify.React;
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
    "label",
    { className: "luminous-theme-menu__row luminous-theme-menu__range" },
    React.createElement(
      "span",
      null,
      React.createElement("span", null, setting.label),
      React.createElement(
        "strong",
        null,
        setting.unit === "%" || setting.unit === "px"
          ? `${value}${setting.unit}`
          : value,
      ),
    ),
    React.createElement("input", {
      type: "range",
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
