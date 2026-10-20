import data from '../../content/photos.json';

export interface Photo {
  name: string;
  file: string;
  author: string;
  profile: string;
  source: string;
  license: string;
}

export const PHOTOS: Photo[] = data.photos;

const byName = new Map(PHOTOS.map((p) => [p.name, p]));

/** Photo for a recipe slug or a decor-* name, if we have one. */
export function photoFor(name: string): Photo | undefined {
  return byName.get(name);
}
