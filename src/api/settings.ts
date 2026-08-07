import {
  SettingDefinition,
  SettingListener,
  SettingSnapshot,
  SettingValue,
} from '../types/runtime/settings.types';

export class Settings {
  private static readonly STORAGE_KEY = 'luminous-settings';
  private static readonly PERSIST_DELAY_MS = 180;

  private static registry = new Map<string, SettingDefinition>();
  private static values = new Map<string, SettingValue>();
  private static listeners = new Map<string, Set<SettingListener>>();
  private static savedValues = new Map<string, unknown>();
  private static persistTimer: number | null = null;
  private static initialized = false;
  private static batchDepth = 0;
  private static persistQueued = false;

  private static readonly handlePageHide = () => {
    this.flushPersist();
  };

  static init(): void {
    if (this.initialized) return;

    this.initialized = true;
    this.savedValues.clear();

    Object.entries(this.readSavedValues()).forEach(([key, value]) => {
      this.savedValues.set(key, value);
    });

    this.registry.forEach((definition, key) => {
      const value = this.normalizeValue(definition, this.savedValues.get(key));
      this.values.set(key, value);
      this.savedValues.set(key, value);
      this.apply(key, definition, value);
    });

    window.addEventListener('pagehide', this.handlePageHide);
    this.persistNow();
  }

  static destroy(): void {
    if (this.persistTimer !== null) {
      window.clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }

    if (this.initialized) {
      this.persistNow();
      window.removeEventListener('pagehide', this.handlePageHide);
    }

    this.listeners.clear();
    this.values.clear();
    this.savedValues.clear();
    this.registry.clear();
    this.batchDepth = 0;
    this.persistQueued = false;
    this.initialized = false;
  }

  static register<T extends SettingValue>(
    key: string,
    definition: SettingDefinition<T>,
  ): void {
    this.registry.set(key, definition as unknown as SettingDefinition);

    if (!this.initialized) return;

    const value = this.normalizeValue(
      definition as unknown as SettingDefinition,
      this.values.get(key) ?? this.savedValues.get(key),
    );
    this.values.set(key, value);
    this.savedValues.set(key, value);
    this.apply(key, definition as unknown as SettingDefinition, value);
    this.schedulePersist();
  }

  static get<T extends SettingValue>(key: string): T {
    if (this.values.has(key)) return this.values.get(key) as T;

    const definition = this.registry.get(key);
    return definition?.default as T;
  }

  static has(key: string): boolean {
    return this.registry.has(key);
  }

  static set(key: string, value: SettingValue): void {
    this.setInternal(key, value, true);
  }

  static setMany(values: Record<string, SettingValue>): void {
    this.batch(() => {
      Object.entries(values).forEach(([key, value]) => {
        this.setInternal(key, value, true);
      });
    });
  }

  static reset(key: string): void {
    const definition = this.registry.get(key);
    if (!definition) return;

    this.set(key, definition.default);
  }

  static resetMany(keys: readonly string[]): void {
    this.batch(() => {
      keys.forEach((key) => {
        const definition = this.registry.get(key);
        if (!definition) return;

        this.setInternal(key, definition.default, true);
      });
    });
  }

  static resetAll(): void {
    this.resetMany([...this.registry.keys()]);
  }

  static snapshot(): SettingSnapshot {
    const snapshot: SettingSnapshot = {};

    this.registry.forEach((definition, key) => {
      snapshot[key] = this.values.get(key) ?? definition.default;
    });

    return snapshot;
  }

  static subscribe<T extends SettingValue>(
    key: string,
    listener: SettingListener<T>,
    options: { immediate?: boolean } = {},
  ): () => void {
    this.getListeners(key).add(listener as SettingListener);

    if (options.immediate) {
      const value = this.values.get(key) ?? this.registry.get(key)?.default;
      if (value !== undefined) {
        this.callListener(key, listener as SettingListener, value);
      }
    }

    return () => {
      this.listeners.get(key)?.delete(listener as SettingListener);
    };
  }

  static getVar(name: string): string {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }

  static setVar(name: string, value: string): void {
    document.documentElement.style.setProperty(name, value);
  }

  static removeVar(name: string): void {
    document.documentElement.style.removeProperty(name);
  }

  static toggleClass(className: string, force?: boolean): void {
    document.documentElement.classList.toggle(className, force);
  }

  static hasClass(className: string): boolean {
    return document.documentElement.classList.contains(className);
  }

  private static setInternal(
    key: string,
    value: SettingValue,
    notify: boolean,
  ): void {
    const definition = this.registry.get(key);

    if (!definition) {
      Luminous.Logger.warn('Settings', `Unknown setting: ${key}`);
      return;
    }

    const normalized = this.normalizeValue(definition, value);
    if (Object.is(this.values.get(key), normalized)) return;

    this.values.set(key, normalized);
    this.savedValues.set(key, normalized);
    this.apply(key, definition, normalized);
    if (notify) this.emit(key, normalized);
    this.schedulePersist();
  }

  private static batch(callback: () => void): void {
    this.batchDepth++;

    try {
      callback();
    } finally {
      this.batchDepth--;

      if (this.batchDepth === 0 && this.persistQueued) {
        this.persistQueued = false;
        this.schedulePersist();
      }
    }
  }

  private static readSavedValues(): Record<string, unknown> {
    try {
      const saved = Spicetify.LocalStorage.get(this.STORAGE_KEY);
      if (!saved) return {};

      const parsed: unknown = JSON.parse(saved);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        return parsed as Record<string, unknown>;
      }
    } catch (error) {
      Luminous.Logger.warn('Settings', 'Failed to read saved settings', error);
    }

    return {};
  }

  private static normalizeValue(
    definition: SettingDefinition,
    value: unknown,
  ): SettingValue {
    let normalized = value ?? definition.default;

    if (definition.normalize) {
      try {
        normalized = definition.normalize(normalized);
      } catch (error) {
        Luminous.Logger.warn(
          'Settings',
          'Failed to normalize setting value',
          error,
        );
        return definition.default;
      }
    }

    if (typeof normalized === typeof definition.default) {
      if (typeof normalized !== 'number' || Number.isFinite(normalized)) {
        return normalized as SettingValue;
      }
    }

    Luminous.Logger.warn('Settings', 'Invalid setting value, using default');
    return definition.default;
  }

  private static apply(
    key: string,
    definition: SettingDefinition,
    value: SettingValue,
  ): void {
    try {
      definition.apply?.(value);
    } catch (error) {
      Luminous.Logger.error(
        'Settings',
        `Failed to apply setting: ${key}`,
        error,
      );
    }
  }

  private static schedulePersist(): void {
    if (this.batchDepth > 0) {
      this.persistQueued = true;
      return;
    }

    if (this.persistTimer !== null) {
      window.clearTimeout(this.persistTimer);
    }

    this.persistTimer = window.setTimeout(() => {
      this.persistTimer = null;
      this.persistNow();
    }, this.PERSIST_DELAY_MS);
  }

  private static flushPersist(): void {
    if (this.persistTimer !== null) {
      window.clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }

    this.persistQueued = false;
    this.persistNow();
  }

  private static persistNow(): void {
    const saved: Record<string, SettingValue> = {};

    this.savedValues.forEach((value, key) => {
      if (
        typeof value === 'string' ||
        typeof value === 'boolean' ||
        (typeof value === 'number' && Number.isFinite(value))
      ) {
        saved[key] = value;
      }
    });

    this.registry.forEach((definition, key) => {
      saved[key] = this.values.get(key) ?? definition.default;
    });

    try {
      Spicetify.LocalStorage.set(this.STORAGE_KEY, JSON.stringify(saved));
    } catch (error) {
      Luminous.Logger.error('Settings', 'Failed to persist settings', error);
    }
  }

  private static emit(key: string, value: SettingValue): void {
    this.listeners.get(key)?.forEach((listener) => {
      this.callListener(key, listener, value);
    });
  }

  private static callListener(
    key: string,
    listener: SettingListener,
    value: SettingValue,
  ): void {
    try {
      listener(value, key);
    } catch (error) {
      Luminous.Logger.error(
        'Settings',
        `Setting listener failed: ${key}`,
        error,
      );
    }
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
