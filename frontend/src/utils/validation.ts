export function isEmail(v: string): boolean {
  return /\S+@\S+\.\S+/.test(v);
}

export function isPhone(v: string): boolean {
  return /^[\d\s\-+()]{10,15}$/.test(v.replace(/\s/g, ''));
}

export function minLength(v: string, min: number): boolean {
  return v.trim().length >= min;
}

export function required(v: string): boolean {
  return v.trim().length > 0;
}
