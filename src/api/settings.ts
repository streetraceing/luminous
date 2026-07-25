import {
  SettingDefinition,
  SettingListener,
  SettingValue,
} from '../types/runtime/settings.types';

export class Settings {
  private static STORAGE_KEY = 'luminous-settings';

  private static registry = new Map<string, SettingDefinition>();
  private static values = new Map<string, SettingValue>();
  private static listeners = new Map<string, Set<SettingListener>>();

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
    this.emit(key, value);
    this.persist();
  }

  static reset(key: string) {
    const definition = this.registry.get(key);
    if (!definition) return;

    this.set(key, definition.default);
  }

  static resetMany(keys: string[]) {
    keys.forEach((key) => {
      const definition = this.registry.get(key);
      if (!definition) return;

      this.values.set(key, definition.default);
      definition.apply?.(definition.default);
      this.emit(key, definition.default);
    });

    this.persist();
  }

  static subscribe<T extends SettingValue>(
    key: string,
    listener: SettingListener<T>,
    options: { immediate?: boolean } = {},
  ): () => void {
    this.getListeners(key).add(listener as SettingListener);

    if (options.immediate && this.values.has(key)) {
      listener(this.values.get(key) as T, key);
    }

    return () => {
      this.listeners.get(key)?.delete(listener as SettingListener);
    };
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

  private static emit(key: string, value: SettingValue) {
    this.listeners.get(key)?.forEach((listener) => {
      listener(value, key);
    });
  }

  private static getListeners(key: string): Set<SettingListener> {
    let listeners = this.listeners.get(key);

    if (!listeners) {
      listeners = new Set();
      this.listeners.set(key, listeners);
    }

    return listeners;
  }
}
