'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import type { ProductImage } from '@/types/product-image';
import { ChevronLeft, ChevronRight } from '@/components/icons/chevron';

interface ProductImageGalleryProps {
  images: ProductImage[];
  className?: string;
}

export function ProductImageGallery({ images, className = '' }: ProductImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // All hooks must be called unconditionally — before any early return
  const galleryRef = useRef<HTMLDivElement>(null);

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const goToPrevious = useCallback(() => {
    if (hasPrevious) setCurrentIndex((prev) => prev - 1);
  }, [hasPrevious]);

  const goToNext = useCallback(() => {
    if (hasNext) setCurrentIndex((prev) => prev + 1);
  }, [hasNext]);

  const selectImage = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToPrevious();
    else if (e.key === 'ArrowRight') goToNext();
  }, [goToPrevious, goToNext]);

  useEffect(() => {
    if (galleryRef.current) galleryRef.current.focus();
  }, []);

  // Early return after all hooks
  if (!images || images.length === 0) {
    return (
      <div
        data-testid="image-gallery"
        role="region"
        aria-label="Product image gallery"
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
      >
        <p className="text-gray-500">No images available</p>
      </div>
    );
  }

  const currentImage = images[currentIndex];

  return (
    <div
      ref={galleryRef}
      data-testid="image-gallery"
      role="region"
      aria-label="Product image gallery"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`flex flex-col gap-4 ${className}`}
    >
      {/* Main Image */}
      <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
        <Image
          src={currentImage.url}
          alt={currentImage.alt_text || ''}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
        />

        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              disabled={!hasPrevious}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={goToNext}
              disabled={!hasNext}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            <div className="absolute bottom-2 right-2 px-3 py-1 bg-black/70 text-white text-sm rounded-full">
              {currentIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => selectImage(index)}
              aria-label={`View image ${index + 1}${image.alt_text ? `: ${image.alt_text}` : ''}`}
              aria-current={index === currentIndex ? 'true' : undefined}
              className={`
                flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden relative
                transition-all ring-2 ring-offset-2
                ${index === currentIndex
                  ? 'ring-blue-500 scale-105'
                  : 'ring-transparent hover:ring-gray-300'
                }
              `}
            >
              <Image
                src={image.thumbnail_url || image.url}
                alt={image.alt_text || ''}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
