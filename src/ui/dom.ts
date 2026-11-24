// 小さな DOM ヘルパー
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | boolean | undefined> = {},
  children: Array<Node | string> | string = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k === 'html') el.innerHTML = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  if (typeof children === 'string') el.textContent = children;
  else for (const c of children) el.append(c);
  return el;
}

const textCache = new WeakMap<Node, string>();
/** 値が変わったときだけ textContent を書き換える */
export function setText(el: Node, s: string): void {
  if (textCache.get(el) === s) return;
  textCache.set(el, s);
  el.textContent = s;
}

const clsCache = new WeakMap<Element, string>();
export function setClass(el: Element, s: string): void {
  if (clsCache.get(el) === s) return;
  clsCache.set(el, s);
  el.className = s;
}

export function toggle(el: Element, cls: string, on: boolean): void {
  if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on);
}

const scaleCache = new WeakMap<HTMLElement, number>();
/** 進捗バー（transform のみ変更） */
export function setBar(el: HTMLElement, frac: number): void {
  const f = Math.max(0, Math.min(1, frac));
  const r = Math.round(f * 500) / 500;
  if (scaleCache.get(el) === r) return;
  scaleCache.set(el, r);
  el.style.transform = `scaleX(${r})`;
}

export function setDisabled(el: HTMLButtonElement, d: boolean): void {
  if (el.disabled !== d) el.disabled = d;
}
