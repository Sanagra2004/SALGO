-- SALGO — los 30 lugares de Mar del Plata.
--
-- Las coordenadas se sacaron una por una de OpenStreetMap a partir de las
-- direcciones. 25 son exactas; 5 (las de playa, sin dirección de calle) están
-- marcadas geo='aprox' y conviene corregirlas a mano desde el panel.
--
-- `capacity` es una estimación por tipo de local: es el divisor del cálculo de
-- afluencia, así que conviene ajustarla con el dato real de cada lugar.

insert into public.places
  (name, city, type, genre, badge, addr, lat, lng, geo, entrada, consumo,
   horario, rating, icon, cat, color1, color2, is_open, instagram)
values
  ('Samsara Beach', 'Mar del Plata', 'Boliche · Electrónica / House', 'Electrónica / House', 'ELECTRÓNICA · HOUSE', 'RP11 4866, Playa Grande, Mar del Plata', -38.024321, -57.541179, 'aprox', '$5.000', '$1.500', '22–06h', 4.8, '🌊', array['Boliche','Techno']::text[], '#ff2d55', '#b44dff', true, 'samsarabeach.mdq'),
  ('Luna Disco', 'Mar del Plata', 'Boliche · Cumbia / RKT / Pop', 'Cumbia / RKT', 'CUMBIA · RKT', 'Av. Independencia 4443, Mar del Plata', -38.018318, -57.570848, 'exacta', '$4.000', '$1.200', '01–07h', 4.6, '🌙', array['Boliche','Cumbia']::text[], '#ffaa00', '#ff6b00', false, 'lunadisco'),
  ('Club Quba', 'Mar del Plata', 'Boliche / Restó · Variado', 'Variado / Pop', 'CLUB · VARIADO', 'Blvd. Marítimo P.P. Ramos 4851', -38.020871, -57.527985, 'exacta', '$4.500', '$1.800', '20–05h', 4.5, '🏖️', array['Boliche','Bar']::text[], '#00e5ff', '#0080ff', true, 'clubquba.mdp'),
  ('La Bodeguita', 'Mar del Plata', 'Bar · Tropical / Mojitos', 'Tropical / Salsa', 'BAR · CUBANO', 'Güemes 3700, Mar del Plata', -38.02192, -57.546575, 'exacta', 'Sin entrada', '$900', '20–03h', 4.7, '🍹', array['Bar','Cumbia']::text[], '#00f5a0', '#00b876', true, 'labodeguitamardelplata'),
  ('Antares Cervecería', 'Mar del Plata', 'Bar · Cerveza Artesanal', 'Rock / Blues', 'CERVECERÍA · CRAFT', 'Av. Juan B. Justo 3964, Mar del Plata', -38.013957, -57.578018, 'exacta', 'Sin entrada', '$800', '18–02h', 4.8, '🍺', array['Bar','Rock']::text[], '#f59e0b', '#ff8c00', true, 'antares_mdp'),
  ('Barwin', 'Mar del Plata', 'Bar · Previa / Tragos', 'Pop / Electrónica', 'BAR · PREVIA', 'Av. Colón 2600, Mar del Plata', -38.003655, -57.550158, 'exacta', 'Sin entrada', '$1.000', '19–04h', 4.4, '🎵', array['Bar']::text[], '#b44dff', '#7c3aed', true, 'barwin.mdp'),
  ('El Container', 'Mar del Plata', 'Bar / Cervecería · Playa', 'Rock / Pop', 'BAR · PLAYA', 'Av. Martínez de Hoz 5550, Mar del Plata', -38.071787, -57.547589, 'exacta', 'Sin entrada', '$700', '16–02h', 4.6, '📦', array['Bar','Rock']::text[], '#22c55e', '#00b876', true, 'elcontainermdp'),
  ('Cheverry Cervecería', 'Mar del Plata', 'Cervecería · Rock / Folk', 'Rock / Folk', 'CERVECERÍA', 'Olavarría 2951, Mar del Plata', -38.015435, -57.543157, 'exacta', 'Sin entrada', '$750', '17–01h', 4.7, '🍻', array['Bar','Rock']::text[], '#f59e0b', '#ffaa00', true, 'cheverry.cerveceria'),
  ('Límite de Pista', 'Mar del Plata', 'Boliche · Electrónica / Techno', 'Techno / House', 'TECHNO · ELECTRO', 'Córdoba 2900, Mar del Plata', -38.008998, -57.554492, 'exacta', '$3.500', '$1.200', '00–07h', 4.5, '🎛️', array['Boliche','Techno']::text[], '#ff2d55', '#b44dff', false, 'limitedepista'),
  ('Alarde', 'Mar del Plata', 'Bar / Cervecería · Craft', 'Rock / Jazz', 'BAR · CRAFT', 'Olavarría 3400, Mar del Plata', -38.01902, -57.545674, 'exacta', 'Sin entrada', '$800', '17–02h', 4.6, '🥃', array['Bar']::text[], '#00e5ff', '#0080ff', true, 'alarde.bar'),
  ('Barrio Mitre Bar', 'Mar del Plata', 'Bar · Bandas en vivo / Tragos', 'Rock / Blues', 'BAR · ROCK LIVE', 'Av. Mitre 1800, Mar del Plata', -38.012074, -57.559909, 'exacta', 'Sin entrada', '$900', '20–04h', 4.5, '🎸', array['Bar','Rock']::text[], '#ef4444', '#dc2626', true, 'barriomitrebar'),
  ('Parador Varese', 'Mar del Plata', 'Parador · House / Electrónica', 'House / Electrónica', 'PARADOR · HOUSE', 'Complejo Balneario Varese, Mar del Plata', -38.014176, -57.530493, 'aprox', '$3.000', '$1.500', '21–06h', 4.4, '🏊', array['Boliche','Techno']::text[], '#00e5ff', '#0080ff', false, 'paradorvarese'),
  ('Tequila Bar', 'Mar del Plata', 'Bar · Latino / Reggaeton', 'Latino / Reggaeton', 'BAR · LATINO', 'Diagonal Alberdi 2350, Mar del Plata', -37.999115, -57.543118, 'exacta', 'Sin entrada', '$800', '21–04h', 4.3, '🍸', array['Bar','Cumbia']::text[], '#ff9f0a', '#ff6b00', true, 'tequilabarmdp'),
  ('Otro Bar MdP', 'Mar del Plata', 'Bar · Indie / Rock Alternativo', 'Indie / Rock Alt.', 'BAR · INDIE', 'San Luis 1400, Mar del Plata', -37.996365, -57.545676, 'exacta', 'Sin entrada', '$700', '20–03h', 4.4, '🎶', array['Bar','Rock']::text[], '#af52de', '#7c3aed', true, 'otrobarmdp'),
  ('Soho Bar', 'Mar del Plata', 'Bar / Club · Pop / RKT', 'Pop / RKT', 'BAR · POP', 'Av. Constitución 5900, Mar del Plata', -37.961152, -57.562618, 'exacta', '$2.500', '$1.000', '23–06h', 4.3, '✨', array['Boliche','Cumbia']::text[], '#ff2d55', '#ff6b8a', false, 'sohobarmdp'),
  ('Waikiki Beach Bar', 'Mar del Plata', 'Bar · Beach / Tropical', 'Tropical / Chill', 'BAR · BEACH', 'Balneario Waikiki, Playa Varese', -38.014176, -57.530493, 'aprox', 'Sin entrada', '$900', '12–23h', 4.5, '🌴', array['Bar']::text[], '#00f5a0', '#00e5ff', true, 'waikikimdp'),
  ('Havana Club MdP', 'Mar del Plata', 'Bar · Cubano / Salsa', 'Salsa / Son Cubano', 'BAR · CUBANO', 'Rivadavia 2200, Mar del Plata', -38.002473, -57.543468, 'exacta', 'Sin entrada', '$800', '20–03h', 4.3, '🎺', array['Bar','Cumbia']::text[], '#22c55e', '#00b876', true, 'havanaclubmdp'),
  ('La Biela MdP', 'Mar del Plata', 'Bar Clásico · Cocktails', 'Jazz / Clásico', 'BAR · CLÁSICO', 'Diagonal Pueyrredón 1740, Mar del Plata', -37.998695, -57.55146, 'exacta', 'Sin entrada', '$900', '19–02h', 4.4, '🥂', array['Bar']::text[], '#f59e0b', '#d97706', true, 'labielamdp'),
  ('Playa Grande Club', 'Mar del Plata', 'Club de Playa · House', 'House / Deep', 'BEACH CLUB', 'Playa Grande, Mar del Plata', -38.024321, -57.541179, 'aprox', '$4.000', '$2.000', '20–06h', 4.6, '🏄', array['Boliche','Techno']::text[], '#00e5ff', '#0080ff', false, 'playagrandeclub'),
  ('Desnivel', 'Mar del Plata', 'Bar Cultural · Rock / Folk', 'Rock / Folk', 'BAR · CULTURAL', 'Belgrano 2300, Mar del Plata', -38.002707, -57.545091, 'exacta', 'Sin entrada', '$650', '18–01h', 4.5, '🎭', array['Bar','Rock']::text[], '#af52de', '#7c3aed', true, 'desnivelbar'),
  ('Bruto Playa Grande', 'Mar del Plata', 'Boliche · Pop / Electrónica / RKT', 'Pop / RKT / Electrónica', 'BOLICHE · BRUTO', 'Escaleras Playa Grande, Mar del Plata', -38.024321, -57.541179, 'aprox', '$4.500', '$1.500', '23–06h', 4.9, '🔥', array['Boliche','Cumbia','Techno']::text[], '#ff2d55', '#ff6b00', false, 'brutopg'),
  ('Señor Juan', 'Mar del Plata', 'Bar · Tragos de autor / Coctelería', 'Jazz / Soul', 'BAR · COCTELERÍA', 'Av. Alem 3200, Mar del Plata', -38.024605, -57.529336, 'exacta', 'Sin entrada', '$1.100', '20–04h', 4.7, '🍹', array['Bar']::text[], '#f59e0b', '#d97706', true, 'senorjuan.bar'),
  ('Bruto Bar', 'Mar del Plata', 'Bar / Restó · Variado', 'Variado', 'BAR · BRUTO', 'Paseo Victoria Ocampo, Playa Grande', -38.028633, -57.532561, 'exacta', 'Sin entrada', '$1.200', '12–04h', 4.7, '🥩', array['Bar']::text[], '#ff4500', '#ff2d55', true, 'brutobar.pg'),
  ('Cuba Boliche', 'Mar del Plata', 'Boliche · Cumbia / Latino', 'Cumbia / Latino / RKT', 'BOLICHE · CUMBIA', 'Av. Constitución 5780, Mar del Plata', -37.961767, -57.561436, 'exacta', '$3.500', '$1.200', '01–07h', 4.5, '🕺', array['Boliche','Cumbia']::text[], '#00b876', '#00e5ff', false, 'cubaboliche.mdp'),
  ('Mr. Jones', 'Mar del Plata', 'Boliche · Electrónica / Rock', 'Electrónica / Rock / Reggae', 'BOLICHE · JONES', 'Alem y Quintana, Mar del Plata', -38.026578, -57.531731, 'exacta', '$3.000', '$1.000', '00–06h', 4.4, '🎸', array['Boliche','Techno','Rock']::text[], '#7c3aed', '#af52de', false, 'mrjonesmdp'),
  ('Estación Central', 'Mar del Plata', 'Bar / Club · Coctelería / DJ', 'Pop / Electrónica', 'BAR · DJ', 'Hipólito Yrigoyen 2875, Mar del Plata', -38.007257, -57.557577, 'exacta', 'Sin entrada', '$900', '20–05h', 4.5, '🚉', array['Bar']::text[], '#ff9f0a', '#ff6b00', true, 'estacioncentralmdp'),
  ('OGham Bar', 'Mar del Plata', 'Bar · Cerveza / Tragos', 'Rock / Pop', 'BAR · ALEM', 'Leandro N. Alem 3454, Mar del Plata', -38.025673, -57.534142, 'exacta', 'Sin entrada', '$800', '18–03h', 4.6, '🍀', array['Bar','Rock']::text[], '#00f5a0', '#00b876', true, 'oghambar'),
  ('Torombolo', 'Mar del Plata', 'Bar · Rock / Indie', 'Rock / Indie', 'BAR · ROCK', 'Leandro N. Alem 3582, Mar del Plata', -38.026615, -57.534909, 'exacta', 'Sin entrada', '$750', '19–03h', 4.5, '🎵', array['Bar','Rock']::text[], '#ef4444', '#dc2626', true, 'torombolobar'),
  ('Proyecto Bar', 'Mar del Plata', 'Bar Cultural · Bandas en vivo', 'Rock / Bandas en vivo', 'BAR · CULTURAL', 'Av. Juan B. Justo 620, Mar del Plata', -38.036071, -57.548788, 'exacta', 'Sin entrada', '$700', '20–03h', 4.6, '🎭', array['Bar','Rock']::text[], '#af52de', '#7c3aed', true, 'proyectobarmdp'),
  ('Tiki Bar', 'Mar del Plata', 'Bar · Tropical / Tragos', 'Tropical / Pop', 'BAR · TIKI', 'Leandro N. Alem 3690, Mar del Plata', -38.027403, -57.535551, 'exacta', 'Sin entrada', '$850', '19–04h', 4.4, '🌺', array['Bar']::text[], '#00e5ff', '#0080ff', true, 'tikibarmdp')
on conflict do nothing;

-- Capacidades estimadas por tipo de local. Ajustar con el dato real.
update public.places set capacity = case
  when type ilike '%boliche%' or type ilike '%club%' or type ilike '%parador%' then 600
  when type ilike '%cervecer%' then 180
  else 150 end
where capacity = 200;
