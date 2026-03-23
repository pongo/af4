export function digits(): string[] {
  return Array.from({ length: 10 }, (_, i) => i.toString());
}

export function withModifier(modifier: string, keys: string[]): string[] {
  return keys.map((key) => `${modifier}+${key}`);
}

export type Filter = (event: KeyboardEvent) => boolean;

export interface BindOptions {
  filterInput?: boolean | Filter;
  prevent?: boolean;
}

export type Handler = (event: KeyboardEvent) => void;

interface ParsedBinding {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
  handler: Handler;
  options: BindOptions;
}

const defaultFilter: Filter = (event) => {
  const target = event.target as HTMLElement;
  const { tagName } = target;
  let flag = true;
  const isInput =
    tagName === "INPUT" &&
    !["checkbox", "radio", "range", "button", "file", "reset", "submit", "color"].includes(
      (target as HTMLInputElement).type,
    );

  if (
    target.isContentEditable ||
    ((isInput || tagName === "TEXTAREA" || tagName === "SELECT") &&
      !(target as HTMLInputElement | HTMLTextAreaElement).readOnly)
  ) {
    flag = false;
  }
  return flag;
};

const keyAliases: Record<string, string> = {
  up: "arrowup",
  down: "arrowdown",
  left: "arrowleft",
  right: "arrowright",
  space: " ",
  enter: "enter",
  home: "home",
  end: "end",
  pageup: "pageup",
  pagedown: "pagedown",
  pgup: "pageup",
  pgdown: "pagedown",
  delete: "delete",
  backspace: "backspace",
  esc: "escape",
  escape: "escape",
  tab: "tab",
};

export function keysHandlerFactory() {
  return new KeysHandlerBuilder();
}

export class KeysHandlerBuilder {
  private bindings: ParsedBinding[] = [];

  add(keys: string | string[], handler: Handler, options: BindOptions = {}) {
    const keyArray = Array.isArray(keys) ? keys : [keys];

    for (const k of keyArray) {
      if (!k) continue;
      this.bindings.push(...this.parseKey(k, handler, options));
    }
    return this;
  }

  private parseKey(combo: string, handler: Handler, options: BindOptions): ParsedBinding[] {
    const parts = combo.split("+").map((p) => p.trim().toLowerCase());

    let ctrl = false;
    let shift = false;
    let alt = false;
    let meta = false;
    let mainKey = "";

    for (const part of parts) {
      if (part === "ctrl") ctrl = true;
      else if (part === "shift") shift = true;
      else if (part === "alt") alt = true;
      else if (part === "meta" || part === "cmd" || part === "win") meta = true;
      else mainKey = part;
    }

    if (keyAliases[mainKey]) {
      mainKey = keyAliases[mainKey];
    }

    // In hotkeys-js, sometimes key names can be mapped to multiple things, but here let's just use exact lowercased key.
    return [{ ctrl, shift, alt, meta, key: mainKey, handler, options }];
  }

  build(): (event: KeyboardEvent) => void {
    return (event: KeyboardEvent) => {
      const keyLower = event.key.toLowerCase();

      for (const binding of this.bindings) {
        if (
          binding.ctrl === event.ctrlKey &&
          binding.shift === event.shiftKey &&
          binding.alt === event.altKey &&
          binding.meta === event.metaKey &&
          binding.key === keyLower
        ) {
          if (binding.options.filterInput) {
            const filterFn =
              typeof binding.options.filterInput === "function"
                ? binding.options.filterInput
                : defaultFilter;
            if (!filterFn(event)) {
              continue;
            }
          }

          if (binding.options.prevent) {
            event.preventDefault();
            event.stopPropagation();
          }

          binding.handler(event);
        }
      }
    };
  }
}
