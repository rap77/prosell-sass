/**
 * ProductImageGallery Component
 *
 * Multi-image gallery with:
 * - Main image display
 * - Thumbnail navigation
 * - Prev/next buttons
 * - Keyboard arrow navigation
 * - Responsive design
 *
 * Following React 19 patterns (ref as prop, no forwardRef)
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ProductImage } from '@/types/product-image';
import { ChevronLeft, ChevronRight } from '@/components/icons/chevron';

interface ProductImageGalleryProps {
  /** Array of product images to display */
  images: ProductImage[];
  /** Optional CSS class name */
  className?: string;
}

export function ProductImageGallery({ images, className = '' }: ProductImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Handle empty images array
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
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  // Navigation handlers
  const goToPrevious = useCallback(() => {
    if (hasPrevious) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [hasPrevious]);

  const goToNext = useCallback(() => {
    if (hasNext) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [hasNext]);

  const selectImage = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      goToPrevious();
    } else if (e.key === 'ArrowRight') {
      goToNext();
    }
  }, [goToPrevious, goToNext]);

  // Focus management for keyboard navigation
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus gallery on mount to enable keyboard navigation
    if (galleryRef.current) {
      galleryRef.current.focus();
    }
  }, []);

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
      {/* Main Image Display */}
      <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
        <img
          src={currentImage.url}
          alt={currentImage.alt_text || ''}
          className="w-full h-full object-contain"
        />

        {/* Navigation Buttons */}
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

            {/* Image Counter */}
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
                flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden
                transition-all ring-2 ring-offset-2
                ${index === currentIndex
                  ? 'ring-blue-500 scale-105'
                  : 'ring-transparent hover:ring-gray-300'
                }
              `}
            >
              <img
                src={image.thumbnail_url || image.url}
                alt={image.alt_text || ''}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
