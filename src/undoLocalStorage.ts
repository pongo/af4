let state: string | null = null;

export const undoLocalStorage = {
  save() {
    state = localStorage.getItem("af4-state");
  },

  restore() {
    if (state === null) return;
    localStorage.setItem("af4-state", state);
  },
};
