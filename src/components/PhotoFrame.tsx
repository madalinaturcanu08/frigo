import Image from 'next/image';
import { photoFor } from '@/lib/photos';

/** A photo in the design's style: rounded, 2px outline. `className` sets the size/shape (e.g. aspect-[4/3]). */
export function PhotoFrame({
  name,
  alt,
  className = '',
  sizes = '(max-width: 640px) 100vw, 400px',
  eager = false,
  children,
}: {
  name: string;
  alt: string;
  className?: string;
  sizes?: string;
  eager?: boolean;
  children?: React.ReactNode;
}) {
  const photo = photoFor(name);
  if (!photo) return null;
  // Positioned so the `fill` image has a box to fill; an `absolute` frame (inside a card) is positioned already.
  const position = /(^|\s)absolute(\s|$)/.test(className) ? '' : 'relative';
  return (
    <div className={`${position} overflow-hidden ${className}`}>
      <Image src={photo.file} alt={alt} fill sizes={sizes} loading={eager ? 'eager' : 'lazy'} className="object-cover" />
      {children}
    </div>
  );
}
