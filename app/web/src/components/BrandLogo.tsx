import Image from 'next/image';

type BrandLogoVariant = 'primary-light' | 'primary-dark' | 'compact-light' | 'compact-dark' | 'toggle-light' | 'toggle-dark';

const sources: Record<BrandLogoVariant, { src: string; width: number; height: number }> = {
  'primary-light': { src: '/brand/otonom/assets/svg/primary_light.svg', width: 820, height: 217 },
  'primary-dark': { src: '/brand/otonom/assets/svg/primary_dark.svg', width: 820, height: 217 },
  'compact-light': { src: '/brand/otonom/assets/svg/compact_black.svg', width: 820, height: 162 },
  'compact-dark': { src: '/brand/otonom/assets/svg/compact_white.svg', width: 820, height: 162 },
  'toggle-light': { src: '/brand/otonom/assets/svg/toggle_icon.svg', width: 200, height: 160 },
  'toggle-dark': { src: '/brand/otonom/assets/svg/toggle_icon_dark.svg', width: 200, height: 160 },
};

export function BrandLogo({
  variant,
  className,
  priority = false,
  decorative = false,
}: {
  variant: BrandLogoVariant;
  className?: string;
  priority?: boolean;
  decorative?: boolean;
}) {
  const asset = sources[variant];
  return (
    <Image
      className={className}
      src={asset.src}
      width={asset.width}
      height={asset.height}
      alt={decorative ? '' : 'OTONOM — IOT SOLUTIONS'}
      priority={priority}
      unoptimized
    />
  );
}
