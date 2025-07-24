const states = new Map<string, string>();

export const undoLocalStorage = {
  save(id: string) {
    const item = localStorage.getItem(`af4-${id}`);
    if (item == null) return;
    states.set(id, item);
  },

  restore(id: string) {
    const state = states.get(id);
    if (state == null) return;
    localStorage.setItem(`af4-${id}`, state);
  },
};
