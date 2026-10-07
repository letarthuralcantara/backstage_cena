UPDATE "clube"
SET "imagem" = '/images/clubes%20images/Garageband_logo.png'
WHERE "tipo" = 'daw'
  AND lower(replace("tag", ' ', '')) LIKE '%garageband%';

UPDATE "clube"
SET "imagem" = '/images/clubes%20images/cubase_logo.svg'
WHERE "tipo" = 'daw'
  AND lower("tag") LIKE '%cubase%';

UPDATE "clube"
SET "imagem" = '/images/clubes%20images/logic_logo.webp'
WHERE "tipo" = 'daw'
  AND lower(replace("tag", ' ', '')) LIKE '%logicpro%';

UPDATE "clube"
SET "imagem" = '/images/clubes%20images/protools_logo.svg'
WHERE "tipo" = 'daw'
  AND lower(replace("tag", ' ', '')) LIKE '%protools%';

UPDATE "clube"
SET "imagem" = '/images/clubes%20images/reapper_logo.jpg'
WHERE "tipo" = 'daw'
  AND lower("tag") LIKE '%reaper%';

UPDATE "clube"
SET "imagem" = '/images/clubes%20images/studio-one_logo.webp'
WHERE "tipo" = 'daw'
  AND lower(replace("tag", ' ', '')) LIKE '%studioone%';