USE RonaldCareOps;
GO

SET NOCOUNT ON;
GO

DELETE FROM dbo.AuditEvents;
DELETE FROM dbo.CommunityPosts;
DELETE FROM dbo.ReturnPasses;
DELETE FROM dbo.ImpactEvents;
DELETE FROM dbo.InventoryMovements;
DELETE FROM dbo.InventoryItems;
DELETE FROM dbo.VolunteerShifts;
DELETE FROM dbo.Trips;
DELETE FROM dbo.Requests;
DELETE FROM dbo.FamilyAccess;
DELETE FROM dbo.Families;
DELETE FROM dbo.Rooms;
DELETE FROM dbo.Referrals;
DELETE FROM dbo.Users;
DELETE FROM dbo.Roles;
DELETE FROM dbo.Sites;
GO

SET IDENTITY_INSERT dbo.Sites ON;
INSERT INTO dbo.Sites (SiteId, SiteCode, Name, IsActive, CreatedAt) VALUES
(1, 'CDMX', 'Casa Ronald McDonald Ciudad de Mexico', 1, SYSUTCDATETIME()),
(2, 'PUE', 'Casa Ronald McDonald Puebla', 1, SYSUTCDATETIME()),
(3, 'TLA', 'Casa Ronald McDonald Tlalnepantla', 1, SYSUTCDATETIME());
SET IDENTITY_INSERT dbo.Sites OFF;
GO

SET IDENTITY_INSERT dbo.Roles ON;
INSERT INTO dbo.Roles (RoleId, RoleCode, DisplayName) VALUES
(1, 'hospital', 'Hospital / Trabajo Social'),
(2, 'staff', 'Staff / Operacion'),
(3, 'volunteer', 'Voluntariado');
SET IDENTITY_INSERT dbo.Roles OFF;
GO

SET IDENTITY_INSERT dbo.Users ON;
INSERT INTO dbo.Users (UserId, SiteId, RoleId, FullName, Email, PasswordHash, IsActive, CreatedAt) VALUES
(1, 1, 1, 'Trabajo Social Demo', 'hospital@ronaldcare.demo', '$2b$10$ceUvibSQEe28iC0UJOpoM.qW48ntxVigab93PJmyVnHZEuLUO5RPq', 1, SYSUTCDATETIME()),
(2, 1, 2, 'Recepcion Demo', 'staff@ronaldcare.demo', '$2b$10$ceUvibSQEe28iC0UJOpoM.qW48ntxVigab93PJmyVnHZEuLUO5RPq', 1, SYSUTCDATETIME()),
(3, 1, 3, 'Voluntario Demo', 'volunteer@ronaldcare.demo', '$2b$10$ceUvibSQEe28iC0UJOpoM.qW48ntxVigab93PJmyVnHZEuLUO5RPq', 1, SYSUTCDATETIME());
SET IDENTITY_INSERT dbo.Users OFF;
GO

SET IDENTITY_INSERT dbo.Rooms ON;
INSERT INTO dbo.Rooms (RoomId, SiteId, RoomCode, Capacity, OccupiedCount, IsActive, CreatedAt) VALUES
(1, 1, 'A-12', 4, 2, 1, SYSUTCDATETIME()),
(2, 1, 'B-03', 3, 1, 1, SYSUTCDATETIME()),
(3, 2, 'P-07', 2, 1, 1, SYSUTCDATETIME()),
(4, 3, 'T-04', 2, 0, 1, SYSUTCDATETIME());
SET IDENTITY_INSERT dbo.Rooms OFF;
GO

SET IDENTITY_INSERT dbo.Referrals ON;
INSERT INTO dbo.Referrals (ReferralId, SiteId, CreatedByUserId, ReferralCode, FamilyCode, Status, ArrivalDate, CompanionCount, LogisticsNote, EligibilityConfirmed, CreatedAt) VALUES
(1, 1, 1, 'REF-2026-1001', 'FAM-3481', 'aceptada', '2026-04-02', 2, 'Llegada por autobus. Requiere orientacion de acceso.', 1, SYSUTCDATETIME()),
(2, 2, 1, 'REF-2026-1002', 'FAM-5520', 'en_revision', '2026-04-03', 1, 'Ingreso vespertino con acompanante unico.', 1, SYSUTCDATETIME()),
(3, 3, 1, 'REF-2026-1003', 'FAM-7781', 'enviada', '2026-04-04', 1, 'Llegada programada para primera hora.', 1, SYSUTCDATETIME());
SET IDENTITY_INSERT dbo.Referrals OFF;
GO

SET IDENTITY_INSERT dbo.Families ON;
INSERT INTO dbo.Families (FamilyId, ReferralId, SiteId, RoomId, CaregiverName, FamilyLastName, AdmissionStatus, IdVerified, RegulationAccepted, SimpleSignature, CheckInCompletedAt, CreatedAt) VALUES
(1, 1, 1, 1, 'Maria', 'Lopez', 'checkin_completado', 1, 1, 'Maria Lopez', SYSUTCDATETIME(), SYSUTCDATETIME()),
(2, 2, 2, NULL, 'Carlos', 'Ramirez', 'pendiente', 0, 0, NULL, NULL, SYSUTCDATETIME()),
(3, 3, 3, NULL, 'Daniela', 'Soto', 'pendiente', 0, 0, NULL, NULL, SYSUTCDATETIME());
SET IDENTITY_INSERT dbo.Families OFF;
GO

SET IDENTITY_INSERT dbo.FamilyAccess ON;
INSERT INTO dbo.FamilyAccess (FamilyAccessId, FamilyId, TicketCode, QrCode, PinHash, IsActive, LastLoginAt, CreatedAt) VALUES
(1, 1, 'TKT-3481', 'QR-FAM-3481', '$2b$10$vtuWzvpg1unem7N0vbTTK.Il0Jj0kgO1YTs4eEYjouPunIp6CAp5K', 1, NULL, SYSUTCDATETIME()),
(2, 2, 'TKT-5520', 'QR-FAM-5520', '$2b$10$sKSlKDzE94PW.FSzXaRVWOhmOACMqMo7Tu.vRdfa7uV92TRx49y3K', 1, NULL, SYSUTCDATETIME()),
(3, 3, 'TKT-7781', 'QR-FAM-7781', '$2b$10$sKSlKDzE94PW.FSzXaRVWOhmOACMqMo7Tu.vRdfa7uV92TRx49y3K', 1, NULL, SYSUTCDATETIME());
SET IDENTITY_INSERT dbo.FamilyAccess OFF;
GO

SET IDENTITY_INSERT dbo.Requests ON;
INSERT INTO dbo.Requests (
  RequestId, SiteId, FamilyId, CreatedByUserId, CreatedBySource, Title, RequestType, Urgency,
  OptionalWindow, PriorityScore, PriorityLabel, PriorityReason, Status, AssignedRole,
  AssignedUserId, AssignedDisplayName, WaitingStartedAt, AssignedAt, ResolvedAt, CreatedAt
) VALUES
(1, 1, 1, 2, 'staff', 'Traslado a hospital', 'transporte', 'alta', '07:30', 88, 'alta', 'Alta urgencia, 52 min esperando, ventana 07:30', 'nueva', 'volunteer', 3, 'Voluntario Demo', DATEADD(MINUTE, -52, SYSUTCDATETIME()), NULL, NULL, DATEADD(MINUTE, -52, SYSUTCDATETIME())),
(2, 1, 1, 2, 'staff', 'Kit de bienvenida', 'kit', 'media', NULL, 50, 'media', 'Media urgencia, 18 min esperando', 'asignada', 'staff', 2, 'Recepcion Demo', DATEADD(MINUTE, -18, SYSUTCDATETIME()), DATEADD(MINUTE, -10, SYSUTCDATETIME()), NULL, DATEADD(MINUTE, -18, SYSUTCDATETIME())),
(3, 2, 2, NULL, 'family', 'Apoyo de recepcion', 'recepcion', 'baja', NULL, 26, 'baja', 'Baja urgencia, 10 min esperando', 'en_proceso', 'staff', 2, 'Recepcion Demo', DATEADD(MINUTE, -10, SYSUTCDATETIME()), DATEADD(MINUTE, -7, SYSUTCDATETIME()), NULL, DATEADD(MINUTE, -10, SYSUTCDATETIME())),
(4, 3, 3, 2, 'staff', 'Kit de llegada', 'kit', 'media', NULL, 48, 'media', 'Media urgencia, 14 min esperando', 'nueva', 'staff', 2, 'Recepcion Demo', DATEADD(MINUTE, -14, SYSUTCDATETIME()), NULL, NULL, DATEADD(MINUTE, -14, SYSUTCDATETIME()));
SET IDENTITY_INSERT dbo.Requests OFF;
GO

SET IDENTITY_INSERT dbo.Trips ON;
INSERT INTO dbo.Trips (TripId, SiteId, FamilyId, RelatedRequestId, Destination, Shift, AssignedUserId, AssignedDisplayName, Status, StartedAt, EndedAt, DurationMinutes, CreatedAt) VALUES
(1, 1, 1, 1, 'Hospital Infantil', 'AM', 3, 'Voluntario Demo', 'pendiente', NULL, NULL, NULL, SYSUTCDATETIME()),
(2, 2, 2, NULL, 'Terminal Norte', 'PM', 3, 'Voluntario Demo', 'finalizado', DATEADD(MINUTE, -42, SYSUTCDATETIME()), DATEADD(MINUTE, -4, SYSUTCDATETIME()), 38, DATEADD(HOUR, -3, SYSUTCDATETIME())),
(3, 3, 3, NULL, 'Hospital Regional', 'AM', 3, 'Voluntario Demo', 'pendiente', NULL, NULL, NULL, SYSUTCDATETIME());
SET IDENTITY_INSERT dbo.Trips OFF;
GO

SET IDENTITY_INSERT dbo.VolunteerShifts ON;
INSERT INTO dbo.VolunteerShifts (VolunteerShiftId, SiteId, UserId, VolunteerName, VolunteerType, RoleName, ShiftDay, ShiftPeriod, AvailabilityStatus, HoursLogged, CreatedAt) VALUES
(1, 1, 3, 'Voluntario Demo', 'individual', 'traslados', '2026-04-02', 'AM', 'disponible', 4.00, SYSUTCDATETIME()),
(2, 2, NULL, 'Equipo Escolar Norte', 'escolar', 'acompanamiento', '2026-04-02', 'PM', 'cupo_limitado', 3.50, SYSUTCDATETIME()),
(3, 3, NULL, 'Brigada Empresarial Sol', 'empresarial', 'recepcion', '2026-04-03', 'AM', 'disponible', 5.00, SYSUTCDATETIME());
SET IDENTITY_INSERT dbo.VolunteerShifts OFF;
GO

SET IDENTITY_INSERT dbo.InventoryItems ON;
INSERT INTO dbo.InventoryItems (InventoryItemId, SiteId, ItemCode, Name, Unit, Stock, MinStock, CreatedAt) VALUES
(1, 1, 'KIT-BIENV', 'Kit bienvenida', 'pieza', 7, 8, SYSUTCDATETIME()),
(2, 2, 'KIT-HIG', 'Kit higiene', 'pieza', 14, 10, SYSUTCDATETIME()),
(3, 3, 'COBIJA', 'Cobija', 'pieza', 21, 6, SYSUTCDATETIME());
SET IDENTITY_INSERT dbo.InventoryItems OFF;
GO

SET IDENTITY_INSERT dbo.InventoryMovements ON;
INSERT INTO dbo.InventoryMovements (InventoryMovementId, InventoryItemId, SiteId, PerformedByUserId, MovementType, Quantity, Reason, CreatedAt) VALUES
(1, 1, 1, 2, 'out', 1, 'Kit entregado a familia durante check-in', DATEADD(HOUR, -2, SYSUTCDATETIME())),
(2, 2, 2, 2, 'out', 2, 'Entrega operativa de higiene', DATEADD(HOUR, -4, SYSUTCDATETIME())),
(3, 3, 3, 2, 'in', 5, 'Reposicion semanal de cobijas', DATEADD(DAY, -1, SYSUTCDATETIME()));
SET IDENTITY_INSERT dbo.InventoryMovements OFF;
GO

SET IDENTITY_INSERT dbo.ImpactEvents ON;
INSERT INTO dbo.ImpactEvents (ImpactEventId, SiteId, EventType, SourceEntityType, SourceEntityId, PublicTitle, PublicDetail, IsPublic, CreatedAt) VALUES
(1, 1, 'checkin_completed', 'family', 1, 'Nueva familia recibida', 'Check-in operativo completado y ficha familia emitida sin incidencias.', 1, DATEADD(HOUR, -1, SYSUTCDATETIME())),
(2, 2, 'request_resolved', 'request', 2, 'Kit entregado a tiempo', 'Un apoyo de bienvenida se completo dentro del flujo operativo.', 1, DATEADD(MINUTE, -30, SYSUTCDATETIME())),
(3, 3, 'request_created', 'request', 4, 'Nueva necesidad registrada', 'Se detecto una necesidad operativa y se agrego al flujo de apoyo.', 1, DATEADD(MINUTE, -12, SYSUTCDATETIME()));
SET IDENTITY_INSERT dbo.ImpactEvents OFF;
GO

SET IDENTITY_INSERT dbo.ReturnPasses ON;
INSERT INTO dbo.ReturnPasses (ReturnPassId, FamilyId, SiteId, RequestedDate, CompanionCount, LogisticsNote, Status, CreatedAt) VALUES
(1, 1, 1, '2026-04-06', 2, 'Regreso para continuidad de hospedaje.', 'enviado', SYSUTCDATETIME()),
(2, 2, 2, '2026-04-08', 1, 'Regreso logistico coordinado con sede Casa Ronald McDonald Puebla.', 'enviado', SYSUTCDATETIME());
SET IDENTITY_INSERT dbo.ReturnPasses OFF;
GO

SET IDENTITY_INSERT dbo.CommunityPosts ON;
INSERT INTO dbo.CommunityPosts (CommunityPostId, FamilyId, AuthorAlias, Message, Status, ReportCount, CreatedAt, ModeratedByUserId, ModeratedAt) VALUES
(1, 1, 'Familia Lopez', 'Llevar horarios anotados nos ayudo mucho para los traslados.', 'active', 0, SYSUTCDATETIME(), NULL, NULL),
(2, 2, 'Familia Horizonte', 'La consulta asistida en recepcion fue muy rapida cuando no tuvimos bateria.', 'active', 0, SYSUTCDATETIME(), NULL, NULL);
SET IDENTITY_INSERT dbo.CommunityPosts OFF;
GO

SET IDENTITY_INSERT dbo.AuditEvents ON;
INSERT INTO dbo.AuditEvents (AuditEventId, SiteId, ActorUserId, ActorFamilyId, EventType, EntityType, EntityId, MetadataJson, CreatedAt) VALUES
(1, 1, 1, NULL, 'referral.created', 'referral', 1, '{"source":"seed"}', SYSUTCDATETIME()),
(2, 1, 2, NULL, 'checkin.completed', 'family', 1, '{"room":"A-12"}', SYSUTCDATETIME()),
(3, 2, 2, NULL, 'request.created', 'request', 3, '{"type":"recepcion"}', SYSUTCDATETIME()),
(4, 1, 2, NULL, 'kit.delivered', 'inventory_movement', 1, '{"item":"Kit bienvenida","quantity":1}', SYSUTCDATETIME()),
(5, 2, 3, NULL, 'trip.finished', 'trip', 2, '{"durationMinutes":38}', SYSUTCDATETIME()),
(6, 3, 2, NULL, 'request.created', 'request', 4, '{"type":"kit"}', SYSUTCDATETIME());
SET IDENTITY_INSERT dbo.AuditEvents OFF;
GO
