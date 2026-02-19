/**
 * Mock for @tauri-apps/plugin-dialog — used in Storybook.
 */

export async function open(_options?: unknown): Promise<string | null> {
  console.log('[mock] dialog.open()', _options);
  return '/mock/selected/folder';
}

export async function save(_options?: unknown): Promise<string | null> {
  console.log('[mock] dialog.save()', _options);
  return '/mock/saved/file.txt';
}

export async function ask(_message: string, _options?: unknown): Promise<boolean> {
  console.log('[mock] dialog.ask()', _message);
  return true;
}

export async function confirm(_message: string, _options?: unknown): Promise<boolean> {
  console.log('[mock] dialog.confirm()', _message);
  return true;
}

export async function message(_message: string, _options?: unknown): Promise<void> {
  console.log('[mock] dialog.message()', _message);
}
