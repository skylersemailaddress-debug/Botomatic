export function validateProjectName(name: string) { return /^[A-Za-z0-9 _-]{3,64}$/.test(name); }
