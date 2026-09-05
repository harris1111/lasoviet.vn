type ArtifactImageProps = {
  alt: string;
  className?: string;
  desktop: string;
  mobile?: string;
};

export function ArtifactImage({
  alt,
  className,
  desktop,
  mobile,
}: ArtifactImageProps) {
  return (
    <picture className={className}>
      {mobile ? <source media="(max-width: 767px)" srcSet={mobile} /> : null}
      <img alt={alt} src={desktop} />
    </picture>
  );
}
