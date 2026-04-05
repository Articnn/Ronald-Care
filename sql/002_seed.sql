TRUNCATE TABLE volunteerchangerequests, volunteertasks, auditevents, communityposts, returnpasses, impactevents, inventorymovements, inventoryitems, volunteershifts, trips, requests, familyaccess, families, rooms, referrals, users, roles, sites RESTART IDENTITY CASCADE;

INSERT INTO sites (siteid, sitecode, name, isactive, createdat) VALUES
  (1, 'CDMX', 'Casa Ronald McDonald Ciudad de Mexico', TRUE, NOW()),
  (2, 'PUE', 'Casa Ronald McDonald Puebla', TRUE, NOW()),
  (3, 'TLA', 'Casa Ronald McDonald Tlalnepantla', TRUE, NOW());

INSERT INTO roles (roleid, rolecode, displayname) VALUES
  (1, 'superadmin', 'Superadmin'),
  (2, 'admin', 'Admin de sede'),
  (3, 'hospital', 'Hospital / Trabajo Social'),
  (4, 'staff', 'Staff / Operacion'),
  (5, 'volunteer', 'Voluntariado');

INSERT INTO users (userid, siteid, roleid, fullname, email, passwordhash, isactive, createdat, updatedat) VALUES
  (1, 1, 1, 'Superadmin Demo', 'superadmin@ronaldcare.demo', '$2b$10$Sn5LdvP3HyJlkEstzg.hkOyoPbbp6oc5xMUISI8xIy5w.bS/6jepO', TRUE, NOW(), NOW()),
  (2, 1, 2, 'Admin CDMX', 'admin@ronaldcare.demo', '$2b$10$Sn5LdvP3HyJlkEstzg.hkOyoPbbp6oc5xMUISI8xIy5w.bS/6jepO', TRUE, NOW(), NOW()),
  (3, 1, 3, 'Trabajo Social Demo', 'hospital@ronaldcare.demo', '$2b$10$ceUvibSQEe28iC0UJOpoM.qW48ntxVigab93PJmyVnHZEuLUO5RPq', TRUE, NOW(), NOW()),
  (4, 1, 4, 'Recepcion Demo', 'staff@ronaldcare.demo', '$2b$10$ceUvibSQEe28iC0UJOpoM.qW48ntxVigab93PJmyVnHZEuLUO5RPq', TRUE, NOW(), NOW()),
  (5, 1, 5, 'Voluntario Demo', 'volunteer@ronaldcare.demo', '$2b$10$ceUvibSQEe28iC0UJOpoM.qW48ntxVigab93PJmyVnHZEuLUO5RPq', TRUE, NOW(), NOW()),
  (6, 2, 4, 'Staff Puebla', 'staff.puebla@ronaldcare.demo', '$2b$10$ceUvibSQEe28iC0UJOpoM.qW48ntxVigab93PJmyVnHZEuLUO5RPq', TRUE, NOW(), NOW()),
  (7, 3, 5, 'Voluntaria Tlalnepantla', 'volunteer.tla@ronaldcare.demo', '$2b$10$ceUvibSQEe28iC0UJOpoM.qW48ntxVigab93PJmyVnHZEuLUO5RPq', TRUE, NOW(), NOW());

INSERT INTO rooms (roomid, siteid, roomcode, capacity, occupiedcount, isactive, createdat) VALUES
  (1, 1, 'A-12', 4, 1, TRUE, NOW()),
  (2, 1, 'B-03', 3, 1, TRUE, NOW()),
  (3, 2, 'P-07', 2, 0, TRUE, NOW()),
  (4, 3, 'T-04', 2, 0, TRUE, NOW());

INSERT INTO referrals (referralid, siteid, createdbyuserid, caregivername, familylastname, referralcode, familycode, status, arrivaldate, companioncount, logisticsnote, eligibilityconfirmed, createdat) VALUES
  (1, 1, 3, 'Maria', 'Lopez', 'REF-2026-1001', 'FAM-3481', 'aceptada', '2026-04-02', 2, 'Llegada por autobus. Requiere orientacion de acceso.', TRUE, NOW()),
  (2, 2, 3, 'Carlos', 'Ramirez', 'REF-2026-1002', 'FAM-5520', 'en_revision', '2026-04-03', 1, 'Ingreso vespertino con acompanante unico.', TRUE, NOW()),
  (3, 3, 4, 'Daniela', 'Soto', 'REF-2026-1003', 'FAM-7781', 'enviada', '2026-04-04', 1, 'Llegada programada para primera hora.', TRUE, NOW());

INSERT INTO families (familyid, referralid, siteid, roomid, caregivername, familylastname, admissionstatus, idverified, regulationaccepted, simplesignature, checkincompletedat, createdat, updatedat) VALUES
  (1, 1, 1, 1, 'Maria', 'Lopez', 'checkin_completado', TRUE, TRUE, 'Maria Lopez', NOW(), NOW(), NOW());

INSERT INTO familyaccess (familyaccessid, familyid, ticketcode, qrcode, pinhash, isactive, lastloginat, createdat, updatedat) VALUES
  (1, 1, 'TKT-3481', 'QR-FAM-3481', '$2b$10$vtuWzvpg1unem7N0vbTTK.Il0Jj0kgO1YTs4eEYjouPunIp6CAp5K', TRUE, NULL, NOW(), NOW());

INSERT INTO requests (
  requestid, siteid, familyid, createdbyuserid, createdbysource, title, requesttype, urgency,
  optionalwindow, priorityscore, prioritylabel, priorityreason, status, assignedrole,
  assigneduserid, assigneddisplayname, waitingstartedat, assignedat, resolvedat, createdat
) VALUES
  (1, 1, 1, 4, 'staff', 'Traslado a hospital', 'transporte', 'alta', '07:30', 88, 'alta', 'Alta urgencia, 52 min esperando, ventana 07:30', 'nueva', 'volunteer', 5, 'Voluntario Demo', NOW() - interval '52 minutes', NULL, NULL, NOW() - interval '52 minutes'),
  (2, 1, 1, 4, 'staff', 'Kit de bienvenida', 'kit', 'media', NULL, 50, 'media', 'Media urgencia, 18 min esperando', 'asignada', 'staff', 4, 'Recepcion Demo', NOW() - interval '18 minutes', NOW() - interval '10 minutes', NULL, NOW() - interval '18 minutes');

INSERT INTO trips (tripid, siteid, familyid, relatedrequestid, destination, shift, assigneduserid, assigneddisplayname, status, startedat, endedat, durationminutes, createdat) VALUES
  (1, 1, 1, 1, 'Hospital Infantil', 'AM', 5, 'Voluntario Demo', 'pendiente', NULL, NULL, NULL, NOW()),
  (2, 1, 1, NULL, 'Terminal Norte', 'PM', 5, 'Voluntario Demo', 'finalizado', NOW() - interval '42 minutes', NOW() - interval '4 minutes', 38, NOW() - interval '3 hours');

INSERT INTO volunteershifts (volunteershiftid, siteid, userid, volunteername, volunteertype, rolename, shiftday, workdays, starttime, endtime, shiftperiod, shiftlabel, availabilitystatus, hourslogged, createdat) VALUES
  (1, 1, 5, 'Voluntario Demo', 'individual', 'traslados', CURRENT_DATE, 'Lunes,Martes,Miercoles,Jueves,Viernes', '08:00', '14:00', 'AM', 'manana', 'disponible', 4.00, NOW()),
  (2, 2, 6, 'Staff Puebla', 'empresarial', 'recepcion', CURRENT_DATE, 'Martes,Jueves', '13:00', '18:00', 'PM', 'tarde', 'cupo_limitado', 3.50, NOW()),
  (3, 3, 7, 'Voluntaria Tlalnepantla', 'individual', 'acompanamiento', CURRENT_DATE, 'Lunes,Miercoles,Viernes', '09:00', '15:00', 'AM', 'manana', 'disponible', 5.00, NOW());

INSERT INTO volunteertasks (volunteertaskid, siteid, volunteeruserid, assignedbyuserid, familyid, relatedrequestid, title, tasktype, shiftperiod, taskday, status, notes, createdat, updatedat) VALUES
  (1, 1, 5, 4, 1, 1, 'Traslado matutino a cita', 'traslados', 'AM', CURRENT_DATE, 'pendiente', 'Recoger a la familia a las 07:15', NOW(), NOW()),
  (2, 1, 5, 4, NULL, NULL, 'Apoyo en recepcion de mediodia', 'recepcion', 'PM', CURRENT_DATE, 'en_proceso', 'Cubrir por 2 horas', NOW(), NOW());

INSERT INTO volunteerchangerequests (volunteerchangerequestid, siteid, volunteeruserid, requestedshiftperiod, requestedtasktype, requestedrolename, requestedworkdays, requestedstarttime, requestedendtime, requestedshiftlabel, reason, status, reviewedbyuserid, createdat, updatedat) VALUES
  (1, 1, 5, 'PM', 'acompanamiento', 'acompanamiento', 'Lunes,Martes,Jueves', '14:00', '19:00', 'tarde', 'Necesito cambiar mi turno por clases matutinas.', 'pendiente', NULL, NOW(), NOW());

INSERT INTO inventoryitems (inventoryitemid, siteid, itemcode, name, unit, stock, minstock, createdat) VALUES
  (1, 1, 'KIT-BIENV', 'Kit bienvenida', 'pieza', 7, 8, NOW()),
  (2, 2, 'KIT-HIG', 'Kit higiene', 'pieza', 14, 10, NOW()),
  (3, 3, 'COBIJA', 'Cobija', 'pieza', 21, 6, NOW());

INSERT INTO inventorymovements (inventorymovementid, inventoryitemid, siteid, performedbyuserid, movementtype, quantity, reason, createdat) VALUES
  (1, 1, 1, 4, 'out', 1, 'Kit entregado a familia durante check-in', NOW() - interval '2 hours');

INSERT INTO impactevents (impacteventid, siteid, eventtype, sourceentitytype, sourceentityid, publictitle, publicdetail, ispublic, createdat) VALUES
  (1, 1, 'checkin_completed', 'family', 1, 'Nueva familia recibida', 'Check-in operativo completado y ficha familia emitida sin incidencias.', TRUE, NOW() - interval '1 hour'),
  (2, 1, 'request_resolved', 'request', 2, 'Kit entregado a tiempo', 'Un apoyo de bienvenida se completo dentro del flujo operativo.', TRUE, NOW() - interval '30 minutes');

INSERT INTO returnpasses (returnpassid, familyid, siteid, requesteddate, companioncount, logisticsnote, status, createdat) VALUES
  (1, 1, 1, '2026-04-06', 2, 'Regreso para continuidad de hospedaje.', 'enviado', NOW());

INSERT INTO communityposts (communitypostid, familyid, authoralias, message, status, reportcount, createdat, moderatedbyuserid, moderatedat) VALUES
  (1, 1, 'Familia Lopez', 'Llevar horarios anotados nos ayudo mucho para los traslados.', 'active', 0, NOW(), NULL, NULL);

INSERT INTO auditevents (auditeventid, siteid, actoruserid, actorfamilyid, eventtype, entitytype, entityid, metadatajson, createdat) VALUES
  (1, 1, 3, NULL, 'referral.created', 'referral', 1, '{"source":"seed"}', NOW()),
  (2, 1, 4, NULL, 'checkin.completed', 'family', 1, '{"room":"A-12"}', NOW()),
  (3, 1, 4, NULL, 'request.created', 'request', 1, '{"type":"transporte"}', NOW()),
  (4, 1, 4, NULL, 'volunteer.task_assigned', 'volunteer_task', 1, '{"taskType":"traslados"}', NOW());

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
SELECT setval(pg_get_serial_sequence('volunteertasks', 'volunteertaskid'), COALESCE((SELECT MAX(volunteertaskid) FROM volunteertasks), 1), TRUE);
SELECT setval(pg_get_serial_sequence('volunteerchangerequests', 'volunteerchangerequestid'), COALESCE((SELECT MAX(volunteerchangerequestid) FROM volunteerchangerequests), 1), TRUE);
SELECT setval(pg_get_serial_sequence('inventoryitems', 'inventoryitemid'), COALESCE((SELECT MAX(inventoryitemid) FROM inventoryitems), 1), TRUE);
SELECT setval(pg_get_serial_sequence('inventorymovements', 'inventorymovementid'), COALESCE((SELECT MAX(inventorymovementid) FROM inventorymovements), 1), TRUE);
SELECT setval(pg_get_serial_sequence('impactevents', 'impacteventid'), COALESCE((SELECT MAX(impacteventid) FROM impactevents), 1), TRUE);
SELECT setval(pg_get_serial_sequence('returnpasses', 'returnpassid'), COALESCE((SELECT MAX(returnpassid) FROM returnpasses), 1), TRUE);
SELECT setval(pg_get_serial_sequence('communityposts', 'communitypostid'), COALESCE((SELECT MAX(communitypostid) FROM communityposts), 1), TRUE);
SELECT setval(pg_get_serial_sequence('auditevents', 'auditeventid'), COALESCE((SELECT MAX(auditeventid) FROM auditevents), 1), TRUE);

