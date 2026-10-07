ALTER TABLE "clube" ADD COLUMN "imagem" TEXT;

UPDATE "clube"
SET "imagem" = '/images/clubes%20images/fl-studio_logo.png'
WHERE "tipo" = 'daw'
  AND lower(replace("tag", ' ', '')) LIKE '%flstudio%';

UPDATE "clube"
SET "imagem" = '/images/clubes%20images/ableton_logo.jpg'
WHERE "tipo" = 'daw'
  AND lower("tag") LIKE '%ableton%';