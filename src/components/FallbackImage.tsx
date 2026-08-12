import React, { useState } from 'react';

interface FallbackImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'src'> {
  readonly src?: string | null;
  readonly alt: string;
  readonly fallbackLabel?: string;
  readonly fallbackClassName?: string;
}

const joinClassNames = (...classes: Array<string | undefined>): string =>
  classes.filter(Boolean).join(' ');

export const FallbackImage: React.FC<FallbackImageProps> = ({
  src,
  alt,
  className,
  fallbackLabel,
  fallbackClassName,
  height,
  onError,
  style,
  width,
  ...imageProps
}) => {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const showsFallback = !src || failedSource === src;
  const resolvedFallbackLabel = fallbackLabel ?? `${alt} 이미지 없음`;

  if (showsFallback) {
    return (
      <div
        role="img"
        aria-label={resolvedFallbackLabel}
        className={joinClassNames(
          'flex h-full w-full items-center justify-center bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500',
          className,
          fallbackClassName,
        )}
        style={style}
      >
        <svg
          aria-hidden="true"
          className="h-1/3 w-1/3 min-h-5 min-w-5 max-h-10 max-w-10"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5V6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v10.5a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 17.25v-.75zm0 0l4.72-4.72a2.25 2.25 0 013.18 0l2.1 2.1m0 0l1.47-1.47a2.25 2.25 0 013.18 0L21 15.75M14.25 8.25h.008v.008h-.008V8.25z"
          />
        </svg>
        <span className="sr-only">{resolvedFallbackLabel}</span>
      </div>
    );
  }

  return (
    <img
      {...imageProps}
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      onError={(event) => {
        onError?.(event);
        setFailedSource(src);
      }}
    />
  );
};

export default FallbackImage;
