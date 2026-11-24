-- Turismo Club — 19 : prix des best-sellers alignés juste sous la concurrence (Green Line Tours, nov. 2026)
-- Bus hop-on hop-off 24 h : 28 € → 19,90 € (concurrence 20,90 €) ; Pompéi & Naples : 169 € → 149 € (concurrence 159 €).
UPDATE activities SET price_adult_cents = 1990 WHERE slug = 'hop-on-hop-off';
UPDATE activities SET price_adult_cents = 14900 WHERE slug = 'pompei-naples-journee';
