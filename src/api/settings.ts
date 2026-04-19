type SettingValue = string | number | boolean;

type SettingDefinition = {
  default: SettingValue;
  apply?: (value: SettingValue) => void;
};

export class Settings {
  private static STORAGE_KEY = "luminous-settings";

  private static registry = new Map<string, SettingDefinition>();
  private static values = new Map<string, SettingValue>();

  static init() {
    const saved = Spicetify.LocalStorage.get(this.STORAGE_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.entries(parsed).forEach(([key, value]) => {
          this.values.set(key, value as SettingValue);
        });
      } catch {}
    }

    this.registry.forEach((def, key) => {
      const value = this.values.get(key) ?? def.default;
      this.values.set(key, value);
      def.apply?.(value);
    });
  }

  static register(key: string, def: SettingDefinition) {
    this.registry.set(key, def);

    const existing = this.values.get(key);
    const value = existing ?? def.default;

    this.values.set(key, value);
    def.apply?.(value);
  }

  static get<T extends SettingValue>(key: string): T {
    return this.values.get(key) as T;
  }

  static set(key: string, value: SettingValue) {
    this.values.set(key, value);
    this.registry.get(key)?.apply?.(value);
    this.persist();
  }

  private static persist() {
    const obj: Record<string, SettingValue> = {};
    this.values.forEach((v, k) => {
      obj[k] = v;
    });

    Spicetify.LocalStorage.set(this.STORAGE_KEY, JSON.stringify(obj));
  }

  static getVar(name: string): string {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }

  static setVar(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
  }

  static removeVar(name: string) {
    document.documentElement.style.removeProperty(name);
  }

  static toggleClass(className: string, force?: boolean) {
    document.documentElement.classList.toggle(className, force);
  }

  static hasClass(className: string): boolean {
    return document.documentElement.classList.contains(className);
  }
}
