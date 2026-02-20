import { Observable } from 'rxjs';

/**
 * Represents a tag item that can be assigned to an entity
 */
export interface TagItem {
  id: string;
  label: string;
  value?: any;
}

/**
 * Configuration for the TagControl component
 */
export interface TagControlConfig {
  /** Label displayed above the tag control */
  label: string;

  /** Placeholder text when no tags are selected */
  placeholder?: string;

  /** Load the currently assigned tags for the entity */
  loadTags: (entityId: string) => Observable<TagItem[]>;

  /** Load all available tags that can be assigned */
  loadAvailableTags: () => Observable<TagItem[]>;

  /** Save the tags (called with the complete list of tag IDs) */
  saveTags: (entityId: string, tagIds: string[]) => Observable<any>;

  /** Optional: Whether to auto-save on change (default: false) */
  autoSave?: boolean;
}

