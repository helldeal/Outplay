-- Align role icon URLs with database role slugs.
-- CS2 and CSGO intentionally share the same icon files.
WITH role_icon_map(slug, icon_url) AS (
  VALUES
    ('league-of-legends-toplaner', '/src/assets/roles/league-of-legends-toplaner.png'),
    ('league-of-legends-jungler', '/src/assets/roles/league-of-legends-jungler.png'),
    ('league-of-legends-midlaner', '/src/assets/roles/league-of-legends-midlaner.png'),
    ('league-of-legends-adc', '/src/assets/roles/league-of-legends-adc.png'),
    ('league-of-legends-mid-adc', '/src/assets/roles/league-of-legends-mid-adc.png'),
    ('league-of-legends-support', '/src/assets/roles/league-of-legends-support.png'),

    ('counter-strike-2-rifler', '/src/assets/roles/counter-strike-2-rifler.webp'),
    ('counter-strike-2-entry', '/src/assets/roles/counter-strike-2-entry.webp'),
    ('counter-strike-2-lurker', '/src/assets/roles/counter-strike-2-lurker.webp'),
    ('counter-strike-2-igl', '/src/assets/roles/counter-strike-2-igl.webp'),
    ('counter-strike-2-awper', '/src/assets/roles/counter-strike-2-awper.webp'),
    ('counter-strike-2-anchor', '/src/assets/roles/counter-strike-2-anchor.png'),
    ('counter-strike-2-support', '/src/assets/roles/counter-strike-2-support.webp'),

    ('counter-strike-global-offensive-rifler', '/src/assets/roles/counter-strike-2-rifler.webp'),
    ('counter-strike-global-offensive-entry', '/src/assets/roles/counter-strike-2-entry.webp'),
    ('counter-strike-global-offensive-lurker', '/src/assets/roles/counter-strike-2-lurker.webp'),
    ('counter-strike-global-offensive-igl', '/src/assets/roles/counter-strike-2-igl.webp'),
    ('counter-strike-global-offensive-awper', '/src/assets/roles/counter-strike-2-awper.webp'),
    ('counter-strike-global-offensive-anchor', '/src/assets/roles/counter-strike-2-anchor.png'),
    ('counter-strike-global-offensive-support', '/src/assets/roles/counter-strike-2-support.webp'),

    ('valorant-duelist', '/src/assets/roles/valorant-duelist.webp'),
    ('valorant-controller', '/src/assets/roles/valorant-controller.png'),
    ('valorant-flex', '/src/assets/roles/valorant-flex.webp'),
    ('valorant-sentinel', '/src/assets/roles/valorant-sentinel.png'),
    ('valorant-initiator', '/src/assets/roles/valorant-initiator.webp'),
    ('valorant-igl', '/src/assets/roles/valorant-igl.webp'),

    ('call-of-duty-ar', '/src/assets/roles/call-of-duty-ar.webp'),
    ('call-of-duty-smg', '/src/assets/roles/call-of-duty-smg.webp'),
    ('multi-game-slayer', '/src/assets/roles/multi-game-slayer.webp')
)
UPDATE public.roles r
SET "iconUrl" = rim.icon_url
FROM role_icon_map rim
WHERE r.slug = rim.slug
  AND r."iconUrl" IS DISTINCT FROM rim.icon_url;
