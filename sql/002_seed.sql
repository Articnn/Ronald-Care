TRUNCATE TABLE auditevents, communityposts, returnpasses, impactevents, inventorymovements, inventoryitems, volunteershifts, trips, requests, familyaccess, families, rooms, referrals, users, roles, sites RESTART IDENTITY CASCADE;

INSERT INTO sites (siteid, sitecode, name, isactive, createdat) VALUES
  (1, 'CDMX', 'Casa Ronald McDonald Ciudad de Mexico', TRUE, NOW()),
  (2, 'PUE', 'Casa Ronald McDonald Puebla', TRUE, NOW()),
  (3, 'TLA', 'Casa Ronald McDonald Tlalnepantla', TRUE, NOW());

INSERT INTO roles (roleid, rolecode, displayname) VALUES
  (1, 'hospital', 'Hospital / Trabajo Social'),
  (2, 'staff', 'Staff / Operacion'),
  (3, 'volunteer', 'Voluntariado');

INSERT INTO users (userid, siteid, roleid, fullname, email, passwordhash, isactive, createdat) VALUES
  (1, 1, 1, 'Trabajo Social Demo', 'hospital@ronaldcare.demo', '$2b$10$ceUvibSQEe28iC0UJOpoM.qW48ntxVigab93PJmyVnHZEuLUO5RPq', TRUE, NOW()),
  (2, 1, 2, 'Recepcion Demo', 'staff@ronaldcare.demo', '$2b$10$ceUvibSQEe28iC0UJOpoM.qW48ntxVigab93PJmyVnHZEuLUO5RPq', TRUE, NOW()),
  (3, 1, 3, 'Voluntario Demo', 'volunteer@ronaldcare.demo', '$2b$10$ceUvibSQEe28iC0UJOpoM.qW48ntxVigab93PJmyVnHZEuLUO5RPq', TRUE, NOW());

INSERT INTO rooms (roomid, siteid, roomcode, capacity, occupiedcount, isactive, createdat) VALUES
  (1, 1, 'A-12', 4, 2, TRUE, NOW()),
  (2, 1, 'B-03', 3, 1, TRUE, NOW()),
  (3, 2, 'P-07', 2, 1, TRUE, NOW()),
  (4, 3, 'T-04', 2, 0, TRUE, NOW());

INSERT INTO referrals (referralid, siteid, createdbyuserid, referralcode, familycode, status, arrivaldate, companioncount, logisticsnote, eligibilityconfirmed, createdat) VALUES
  (1, 1, 1, 'REF-2026-1001', 'FAM-3481', 'aceptada', '2026-04-02', 2, 'Llegada por autobus. Requiere orientacion de acceso.', TRUE, NOW()),
  (2, 2, 1, 'REF-2026-1002', 'FAM-5520', 'en_revision', '2026-04-03', 1, 'Ingreso vespertino con acompanante unico.', TRUE, NOW()),
  (3, 3, 1, 'REF-2026-1003', 'FAM-7781', 'enviada', '2026-04-04', 1, 'Llegada programada para primera hora.', TRUE, NOW());

INSERT INTO families (familyid, referralid, siteid, roomid, caregivername, familylastname, admissionstatus, idverified, regulationaccepted, simplesignature, checkincompletedat, createdat) VALUES
  (1, 1, 1, 1, 'Maria', 'Lopez', 'checkin_completado', TRUE, TRUE, 'Maria Lopez', NOW(), NOW()),
  (2, 2, 2, NULL, 'Carlos', 'Ramirez', 'pendiente', FALSE, FALSE, NULL, NULL, NOW()),
  (3, 3, 3, NULL, 'Daniela', 'Soto', 'pendiente', FALSE, FALSE, NULL, NULL, NOW());

INSERT INTO familyaccess (familyaccessid, familyid, ticketcode, qrcode, pinhash, isactive, lastloginat, createdat) VALUES
  (1, 1, 'TKT-3481', 'QR-FAM-3481', '$2b$10$vtuWzvpg1unem7N0vbTTK.Il0Jj0kgO1YTs4eEYjouPunIp6CAp5K', TRUE, NULL, NOW()),
  (2, 2, 'TKT-5520', 'QR-FAM-5520', '$2b$10$sKSlKDzE94PW.FSzXaRVWOhmOACMqMo7Tu.vRdfa7uV92TRx49y3K', TRUE, NULL, NOW()),
  (3, 3, 'TKT-7781', 'QR-FAM-7781', '$2b$10$sKSlKDzE94PW.FSzXaRVWOhmOACMqMo7Tu.vRdfa7uV92TRx49y3K', TRUE, NULL, NOW());

INSERT INTO requests (
  requestid, siteid, familyid, createdbyuserid, createdbysource, title, requesttype, urgency,
  optionalwindow, priorityscore, prioritylabel, priorityreason, status, assignedrole,
  assigneduserid, assigneddisplayname, waitingstartedat, assignedat, resolvedat, createdat
) VALUES
  (1, 1, 1, 2, 'staff', 'Traslado a hospital', 'transporte', 'alta', '07:30', 88, 'alta', 'Alta urgencia, 52 min esperando, ventana 07:30', 'nueva', 'volunteer', 3, 'Voluntario Demo', NOW() - interval '52 minutes', NULL, NULL, NOW() - interval '52 minutes'),
  (2, 1, 1, 2, 'staff', 'Kit de bienvenida', 'kit', 'media', NULL, 50, 'media', 'Media urgencia, 18 min esperando', 'asignada', 'staff', 2, 'Recepcion Demo', NOW() - interval '18 minutes', NOW() - interval '10 minutes', NULL, NOW() - interval '18 minutes'),
  (3, 2, 2, NULL, 'family', 'Apoyo de recepcion', 'recepcion', 'baja', NULL, 26, 'baja', 'Baja urgencia, 10 min esperando', 'en_proceso', 'staff', 2, 'Recepcion Demo', NOW() - interval '10 minutes', NOW() - interval '7 minutes', NULL, NOW() - interval '10 minutes'),
  (4, 3, 3, 2, 'staff', 'Kit de llegada', 'kit', 'media', NULL, 48, 'media', 'Media urgencia, 14 min esperando', 'nueva', 'staff', 2, 'Recepcion Demo', NOW() - interval '14 minutes', NULL, NULL, NOW() - interval '14 minutes');

INSERT INTO trips (tripid, siteid, familyid, relatedrequestid, destination, shift, assigneduserid, assigneddisplayname, status, startedat, endedat, durationminutes, createdat) VALUES
  (1, 1, 1, 1, 'Hospital Infantil', 'AM', 3, 'Voluntario Demo', 'pendiente', NULL, NULL, NULL, NOW()),
  (2, 2, 2, NULL, 'Terminal Norte', 'PM', 3, 'Voluntario Demo', 'finalizado', NOW() - interval '42 minutes', NOW() - interval '4 minutes', 38, NOW() - interval '3 hours'),
  (3, 3, 3, NULL, 'Hospital Regional', 'AM', 3, 'Voluntario Demo', 'pendiente', NULL, NULL, NULL, NOW());

INSERT INTO volunteershifts (volunteershiftid, siteid, userid, volunteername, volunteertype, rolename, shiftday, shiftperiod, availabilitystatus, hourslogged, createdat) VALUES
  (1, 1, 3, 'Voluntario Demo', 'individual', 'traslados', '2026-04-02', 'AM', 'disponible', 4.00, NOW()),
  (2, 2, NULL, 'Equipo Escolar Norte', 'escolar', 'acompanamiento', '2026-04-02', 'PM', 'cupo_limitado', 3.50, NOW()),
  (3, 3, NULL, 'Brigada Empresarial Sol', 'empresarial', 'recepcion', '2026-04-03', 'AM', 'disponible', 5.00, NOW());

INSERT INTO inventoryitems (inventoryitemid, siteid, itemcode, name, unit, stock, minstock, createdat) VALUES
  (1, 1, 'KIT-BIENV', 'Kit bienvenida', 'pieza', 7, 8, NOW()),
  (2, 2, 'KIT-HIG', 'Kit higiene', 'pieza', 14, 10, NOW()),
  (3, 3, 'COBIJA', 'Cobija', 'pieza', 21, 6, NOW());

INSERT INTO inventorymovements (inventorymovementid, inventoryitemid, siteid, performedbyuserid, movementtype, quantity, reason, createdat) VALUES
  (1, 1, 1, 2, 'out', 1, 'Kit entregado a familia durante check-in', NOW() - interval '2 hours'),
  (2, 2, 2, 2, 'out', 2, 'Entrega operativa de higiene', NOW() - interval '4 hours'),
  (3, 3, 3, 2, 'in', 5, 'Reposicion semanal de cobijas', NOW() - interval '1 day');

INSERT INTO impactevents (impacteventid, siteid, eventtype, sourceentitytype, sourceentityid, publictitle, publicdetail, ispublic, createdat) VALUES
  (1, 1, 'checkin_completed', 'family', 1, 'Nueva familia recibida', 'Check-in operativo completado y ficha familia emitida sin incidencias.', TRUE, NOW() - interval '1 hour'),
  (2, 2, 'request_resolved', 'request', 2, 'Kit entregado a tiempo', 'Un apoyo de bienvenida se completo dentro del flujo operativo.', TRUE, NOW() - interval '30 minutes'),
  (3, 3, 'request_created', 'request', 4, 'Nueva necesidad registrada', 'Se detecto una necesidad operativa y se agrego al flujo de apoyo.', TRUE, NOW() - interval '12 minutes');

INSERT INTO returnpasses (returnpassid, familyid, siteid, requesteddate, companioncount, logisticsnote, status, createdat) VALUES
  (1, 1, 1, '2026-04-06', 2, 'Regreso para continuidad de hospedaje.', 'enviado', NOW()),
  (2, 2, 2, '2026-04-08', 1, 'Regreso logistico coordinado con sede Casa Ronald McDonald Puebla.', 'enviado', NOW());

INSERT INTO communityposts (communitypostid, familyid, authoralias, message, status, reportcount, createdat, moderatedbyuserid, moderatedat) VALUES
  (1, 1, 'Familia Lopez', 'Llevar horarios anotados nos ayudo mucho para los traslados.', 'active', 0, NOW(), NULL, NULL),
  (2, 2, 'Familia Horizonte', 'La consulta asistida en recepcion fue muy rapida cuando no tuvimos bateria.', 'active', 0, NOW(), NULL, NULL);

INSERT INTO auditevents (auditeventid, siteid, actoruserid, actorfamilyid, eventtype, entitytype, entityid, metadatajson, createdat) VALUES
  (1, 1, 1, NULL, 'referral.created', 'referral', 1, '{"source":"seed"}', NOW()),
  (2, 1, 2, NULL, 'checkin.completed', 'family', 1, '{"room":"A-12"}', NOW()),
  (3, 2, 2, NULL, 'request.created', 'request', 3, '{"type":"recepcion"}', NOW()),
  (4, 1, 2, NULL, 'kit.delivered', 'inventory_movement', 1, '{"item":"Kit bienvenida","quantity":1}', NOW()),
  (5, 2, 3, NULL, 'trip.finished', 'trip', 2, '{"durationMinutes":38}', NOW()),
  (6, 3, 2, NULL, 'request.created', 'request', 4, '{"type":"kit"}', NOW());

SELECT setval(pg_get_serial_sequence('sites', 'siteid'), COALESCE((SELECT MAX(siteid) FROM sites), 1), TRUE);
SELECT setval(pg_get_serial_sequence('roles', 'roleid'), COALESCE((SELECT MAX(roleid) FROM roles), 1), TRUE);
SELECT setval(pg_get_serial_sequence('users', 'userid'), COALESCE((SELECT MAX(userid) FROM users), 1), TRUE);
SELECT setval(pg_get_serial_sequence('rooms', 'roomid'), COALESCE((SELECT MAX(roomid) FROM rooms), 1), TRUE);
SELECT setval(pg_get_serial_sequence('referrals', 'referralid'), COALESCE((SELECT MAX(referralid) FROM referrals), 1), TRUE);
SELECT setval(pg_get_serial_sequence('families', 'familyid'), COALESCE((SELECT MAX(familyid) FROM families), 1), TRUE);
SELECT setval(pg_get_serial_sequence('familyaccess', 'familyaccessid'), COALESCE((SELECT MAX(familyaccessid) FROM familyaccess), 1), TRUE);
SELECT setval(pg_get_serial_sequence('requests', 'requestid'), COALESCE((SELECT MAX(requestid) FROM requests), 1), TRUE);
SELECT setval(pg_get_serial_sequence('trips', 'tripid'), COALESCE((SELECT MAX(tripid) FROM trips), 1), TRUE);
SELECT setval(pg_get_serial_sequence('volunteershifts', 'volunteershiftid'), COALESCE((SELECT MAX(volunteershiftid) FROM volunteershifts), 1), TRUE);
SELECT setval(pg_get_serial_sequence('inventoryitems', 'inventoryitemid'), COALESCE((SELECT MAX(inventoryitemid) FROM inventoryitems), 1), TRUE);
SELECT setval(pg_get_serial_sequence('inventorymovements', 'inventorymovementid'), COALESCE((SELECT MAX(inventorymovementid) FROM inventorymovements), 1), TRUE);
SELECT setval(pg_get_serial_sequence('impactevents', 'impacteventid'), COALESCE((SELECT MAX(impacteventid) FROM impactevents), 1), TRUE);
SELECT setval(pg_get_serial_sequence('returnpasses', 'returnpassid'), COALESCE((SELECT MAX(returnpassid) FROM returnpasses), 1), TRUE);
SELECT setval(pg_get_serial_sequence('communityposts', 'communitypostid'), COALESCE((SELECT MAX(communitypostid) FROM communityposts), 1), TRUE);
SELECT setval(pg_get_serial_sequence('auditevents', 'auditeventid'), COALESCE((SELECT MAX(auditeventid) FROM auditevents), 1), TRUE);
