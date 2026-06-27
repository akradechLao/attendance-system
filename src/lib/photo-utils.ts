export function getPhotoSrc(photo: string | null): string {
  if (!photo) return "";
  if (photo.startsWith("data:image")) return photo;
  return photo;
}
