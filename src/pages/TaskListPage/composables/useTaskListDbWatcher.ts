import { watch, type Ref } from "vue";
import { useRouter } from "vue-router";
import { db } from "@/app/db.ts";
import { assert } from "smart-invariant";

export function useTaskListDbWatcher(id: Ref<string>) {
  const router = useRouter();

  watch(db.dbChangedData, (data) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    assert(data != null);

    if (data.id === id.value) {
      if (data.type === "delete" && data.storeName === "tasklists_meta") {
        void router.push("/");
        return;
      }
      if (data.type === "change" && data.storeName === "tasklists_data") {
        router.go(0);
        return;
      }
    }
  });
}
