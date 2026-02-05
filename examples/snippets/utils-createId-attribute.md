# Utils — createId / createEmptyAttribute（snapshot）

用于生成对象/关系的 id 与默认 attribute。

```ts
import type { Attribute } from "./types";

export const createId = (prefix: string) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
};

export const createEmptyAttribute = (): Attribute => ({
  name: "",
  description: "",
  formula: "",
});
```

