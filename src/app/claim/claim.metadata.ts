import {
  createMetadataKey,
  metadata,
  MetadataReducer,
  type PathKind,
  type SchemaPath,
  type SchemaPathRules,
} from '@angular/forms/signals';

// [SF] createMetadataKey — single help text shown under a field
export const HELP_TEXT = createMetadataKey<string>();

// [SF] createMetadataKey — list reducer: every `metadata()` call adds one badge
export const API_BADGE = createMetadataKey(MetadataReducer.list<string>());

type Path<T, K extends PathKind> = SchemaPath<T, SchemaPathRules.Supported, K>;

/** Attaches a static help text to a field. */
export function helpText<T, K extends PathKind>(path: Path<T, K>, text: string): void {
  // [SF] metadata — HELP_TEXT
  metadata(path, HELP_TEXT, () => text);
}

/** Records which Signal Forms APIs drive a field (shown when the "Show API" toggle is on). */
export function apiBadge<T, K extends PathKind>(path: Path<T, K>, ...names: string[]): void {
  for (const name of names) {
    // [SF] metadata — API_BADGE
    metadata(path, API_BADGE, () => name);
  }
}
