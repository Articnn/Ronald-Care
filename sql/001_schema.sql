SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF DB_ID('RonaldCareOps') IS NULL
BEGIN
  CREATE DATABASE RonaldCareOps;
END
GO

USE RonaldCareOps;
GO

IF OBJECT_ID('dbo.AuditEvents', 'U') IS NOT NULL DROP TABLE dbo.AuditEvents;
IF OBJECT_ID('dbo.CommunityPosts', 'U') IS NOT NULL DROP TABLE dbo.CommunityPosts;
IF OBJECT_ID('dbo.ReturnPasses', 'U') IS NOT NULL DROP TABLE dbo.ReturnPasses;
IF OBJECT_ID('dbo.ImpactEvents', 'U') IS NOT NULL DROP TABLE dbo.ImpactEvents;
IF OBJECT_ID('dbo.InventoryMovements', 'U') IS NOT NULL DROP TABLE dbo.InventoryMovements;
IF OBJECT_ID('dbo.InventoryItems', 'U') IS NOT NULL DROP TABLE dbo.InventoryItems;
IF OBJECT_ID('dbo.VolunteerShifts', 'U') IS NOT NULL DROP TABLE dbo.VolunteerShifts;
IF OBJECT_ID('dbo.Trips', 'U') IS NOT NULL DROP TABLE dbo.Trips;
IF OBJECT_ID('dbo.Requests', 'U') IS NOT NULL DROP TABLE dbo.Requests;
IF OBJECT_ID('dbo.FamilyAccess', 'U') IS NOT NULL DROP TABLE dbo.FamilyAccess;
IF OBJECT_ID('dbo.Families', 'U') IS NOT NULL DROP TABLE dbo.Families;
IF OBJECT_ID('dbo.Rooms', 'U') IS NOT NULL DROP TABLE dbo.Rooms;
IF OBJECT_ID('dbo.Referrals', 'U') IS NOT NULL DROP TABLE dbo.Referrals;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
IF OBJECT_ID('dbo.Roles', 'U') IS NOT NULL DROP TABLE dbo.Roles;
IF OBJECT_ID('dbo.Sites', 'U') IS NOT NULL DROP TABLE dbo.Sites;
GO

CREATE TABLE dbo.Sites (
  SiteId INT IDENTITY(1,1) PRIMARY KEY,
  SiteCode NVARCHAR(20) NOT NULL UNIQUE,
  Name NVARCHAR(100) NOT NULL,
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

CREATE TABLE dbo.Roles (
  RoleId INT IDENTITY(1,1) PRIMARY KEY,
  RoleCode NVARCHAR(30) NOT NULL UNIQUE,
  DisplayName NVARCHAR(60) NOT NULL
);
GO

CREATE TABLE dbo.Users (
  UserId INT IDENTITY(1,1) PRIMARY KEY,
  SiteId INT NOT NULL,
  RoleId INT NOT NULL,
  FullName NVARCHAR(120) NOT NULL,
  Email NVARCHAR(160) NOT NULL UNIQUE,
  PasswordHash NVARCHAR(255) NOT NULL,
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_Users_Sites FOREIGN KEY (SiteId) REFERENCES dbo.Sites(SiteId),
  CONSTRAINT FK_Users_Roles FOREIGN KEY (RoleId) REFERENCES dbo.Roles(RoleId)
);
GO

CREATE TABLE dbo.Referrals (
  ReferralId INT IDENTITY(1,1) PRIMARY KEY,
  SiteId INT NOT NULL,
  CreatedByUserId INT NOT NULL,
  ReferralCode NVARCHAR(30) NOT NULL UNIQUE,
  FamilyCode NVARCHAR(30) NOT NULL UNIQUE,
  Status NVARCHAR(30) NOT NULL CHECK (Status IN ('enviada', 'en_revision', 'aceptada')),
  ArrivalDate DATE NOT NULL,
  CompanionCount INT NOT NULL CHECK (CompanionCount >= 0),
  LogisticsNote NVARCHAR(500) NULL,
  EligibilityConfirmed BIT NOT NULL DEFAULT 0,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_Referrals_Sites FOREIGN KEY (SiteId) REFERENCES dbo.Sites(SiteId),
  CONSTRAINT FK_Referrals_Users FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(UserId)
);
GO

CREATE TABLE dbo.Rooms (
  RoomId INT IDENTITY(1,1) PRIMARY KEY,
  SiteId INT NOT NULL,
  RoomCode NVARCHAR(20) NOT NULL,
  Capacity INT NOT NULL CHECK (Capacity > 0),
  OccupiedCount INT NOT NULL DEFAULT 0 CHECK (OccupiedCount >= 0),
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_Rooms_Site_Room UNIQUE (SiteId, RoomCode),
  CONSTRAINT FK_Rooms_Sites FOREIGN KEY (SiteId) REFERENCES dbo.Sites(SiteId)
);
GO

CREATE TABLE dbo.Families (
  FamilyId INT IDENTITY(1,1) PRIMARY KEY,
  ReferralId INT NULL,
  SiteId INT NOT NULL,
  RoomId INT NULL,
  CaregiverName NVARCHAR(100) NOT NULL,
  FamilyLastName NVARCHAR(100) NOT NULL,
  AdmissionStatus NVARCHAR(30) NOT NULL CHECK (AdmissionStatus IN ('pendiente', 'checkin_completado')),
  IdVerified BIT NOT NULL DEFAULT 0,
  RegulationAccepted BIT NOT NULL DEFAULT 0,
  SimpleSignature NVARCHAR(150) NULL,
  CheckInCompletedAt DATETIME2 NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_Families_Referrals FOREIGN KEY (ReferralId) REFERENCES dbo.Referrals(ReferralId),
  CONSTRAINT FK_Families_Sites FOREIGN KEY (SiteId) REFERENCES dbo.Sites(SiteId),
  CONSTRAINT FK_Families_Rooms FOREIGN KEY (RoomId) REFERENCES dbo.Rooms(RoomId)
);
GO

CREATE TABLE dbo.FamilyAccess (
  FamilyAccessId INT IDENTITY(1,1) PRIMARY KEY,
  FamilyId INT NOT NULL,
  TicketCode NVARCHAR(40) NOT NULL UNIQUE,
  QrCode NVARCHAR(80) NOT NULL UNIQUE,
  PinHash NVARCHAR(255) NOT NULL,
  IsActive BIT NOT NULL DEFAULT 1,
  LastLoginAt DATETIME2 NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_FamilyAccess_Families FOREIGN KEY (FamilyId) REFERENCES dbo.Families(FamilyId)
);
GO

CREATE TABLE dbo.Requests (
  RequestId INT IDENTITY(1,1) PRIMARY KEY,
  SiteId INT NOT NULL,
  FamilyId INT NOT NULL,
  CreatedByUserId INT NULL,
  CreatedBySource NVARCHAR(20) NOT NULL CHECK (CreatedBySource IN ('staff', 'family', 'system')),
  Title NVARCHAR(160) NOT NULL,
  RequestType NVARCHAR(30) NOT NULL CHECK (RequestType IN ('transporte', 'kit', 'alimento', 'recepcion')),
  Urgency NVARCHAR(20) NOT NULL CHECK (Urgency IN ('baja', 'media', 'alta')),
  OptionalWindow NVARCHAR(30) NULL,
  PriorityScore INT NOT NULL CHECK (PriorityScore BETWEEN 0 AND 100),
  PriorityLabel NVARCHAR(20) NOT NULL CHECK (PriorityLabel IN ('baja', 'media', 'alta')),
  PriorityReason NVARCHAR(255) NOT NULL,
  Status NVARCHAR(30) NOT NULL CHECK (Status IN ('nueva', 'asignada', 'en_proceso', 'resuelta')),
  AssignedRole NVARCHAR(30) NULL CHECK (AssignedRole IN ('staff', 'volunteer')),
  AssignedUserId INT NULL,
  AssignedDisplayName NVARCHAR(120) NULL,
  WaitingStartedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  AssignedAt DATETIME2 NULL,
  ResolvedAt DATETIME2 NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_Requests_Sites FOREIGN KEY (SiteId) REFERENCES dbo.Sites(SiteId),
  CONSTRAINT FK_Requests_Families FOREIGN KEY (FamilyId) REFERENCES dbo.Families(FamilyId),
  CONSTRAINT FK_Requests_Users_Created FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(UserId),
  CONSTRAINT FK_Requests_Users_Assigned FOREIGN KEY (AssignedUserId) REFERENCES dbo.Users(UserId)
);
GO

CREATE TABLE dbo.Trips (
  TripId INT IDENTITY(1,1) PRIMARY KEY,
  SiteId INT NOT NULL,
  FamilyId INT NOT NULL,
  RelatedRequestId INT NULL,
  Destination NVARCHAR(160) NOT NULL,
  Shift NVARCHAR(2) NOT NULL CHECK (Shift IN ('AM', 'PM')),
  AssignedUserId INT NULL,
  AssignedDisplayName NVARCHAR(120) NULL,
  Status NVARCHAR(30) NOT NULL CHECK (Status IN ('pendiente', 'en_curso', 'finalizado')),
  StartedAt DATETIME2 NULL,
  EndedAt DATETIME2 NULL,
  DurationMinutes INT NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_Trips_Sites FOREIGN KEY (SiteId) REFERENCES dbo.Sites(SiteId),
  CONSTRAINT FK_Trips_Families FOREIGN KEY (FamilyId) REFERENCES dbo.Families(FamilyId),
  CONSTRAINT FK_Trips_Requests FOREIGN KEY (RelatedRequestId) REFERENCES dbo.Requests(RequestId),
  CONSTRAINT FK_Trips_Users FOREIGN KEY (AssignedUserId) REFERENCES dbo.Users(UserId)
);
GO

CREATE TABLE dbo.VolunteerShifts (
  VolunteerShiftId INT IDENTITY(1,1) PRIMARY KEY,
  SiteId INT NOT NULL,
  UserId INT NULL,
  VolunteerName NVARCHAR(120) NOT NULL,
  VolunteerType NVARCHAR(30) NOT NULL CHECK (VolunteerType IN ('individual', 'escolar', 'empresarial')),
  RoleName NVARCHAR(40) NOT NULL CHECK (RoleName IN ('traslados', 'recepcion', 'acompanamiento')),
  ShiftDay DATE NOT NULL,
  ShiftPeriod NVARCHAR(20) NOT NULL CHECK (ShiftPeriod IN ('AM', 'PM')),
  AvailabilityStatus NVARCHAR(30) NOT NULL CHECK (AvailabilityStatus IN ('disponible', 'cupo_limitado', 'no_disponible')),
  HoursLogged DECIMAL(5,2) NOT NULL DEFAULT 0,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_VolunteerShifts_Sites FOREIGN KEY (SiteId) REFERENCES dbo.Sites(SiteId),
  CONSTRAINT FK_VolunteerShifts_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId)
);
GO

CREATE TABLE dbo.InventoryItems (
  InventoryItemId INT IDENTITY(1,1) PRIMARY KEY,
  SiteId INT NOT NULL,
  ItemCode NVARCHAR(30) NOT NULL,
  Name NVARCHAR(120) NOT NULL,
  Unit NVARCHAR(20) NOT NULL DEFAULT 'pieza',
  Stock INT NOT NULL DEFAULT 0,
  MinStock INT NOT NULL DEFAULT 0,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_InventoryItems_SiteCode UNIQUE (SiteId, ItemCode),
  CONSTRAINT FK_InventoryItems_Sites FOREIGN KEY (SiteId) REFERENCES dbo.Sites(SiteId)
);
GO

CREATE TABLE dbo.InventoryMovements (
  InventoryMovementId INT IDENTITY(1,1) PRIMARY KEY,
  InventoryItemId INT NOT NULL,
  SiteId INT NOT NULL,
  PerformedByUserId INT NULL,
  MovementType NVARCHAR(10) NOT NULL CHECK (MovementType IN ('in', 'out')),
  Quantity INT NOT NULL CHECK (Quantity > 0),
  Reason NVARCHAR(255) NOT NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_InventoryMovements_Items FOREIGN KEY (InventoryItemId) REFERENCES dbo.InventoryItems(InventoryItemId),
  CONSTRAINT FK_InventoryMovements_Sites FOREIGN KEY (SiteId) REFERENCES dbo.Sites(SiteId),
  CONSTRAINT FK_InventoryMovements_Users FOREIGN KEY (PerformedByUserId) REFERENCES dbo.Users(UserId)
);
GO

CREATE TABLE dbo.ImpactEvents (
  ImpactEventId INT IDENTITY(1,1) PRIMARY KEY,
  SiteId INT NOT NULL,
  EventType NVARCHAR(50) NOT NULL,
  SourceEntityType NVARCHAR(50) NOT NULL,
  SourceEntityId INT NOT NULL,
  PublicTitle NVARCHAR(150) NOT NULL,
  PublicDetail NVARCHAR(400) NOT NULL,
  IsPublic BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_ImpactEvents_Sites FOREIGN KEY (SiteId) REFERENCES dbo.Sites(SiteId)
);
GO

CREATE TABLE dbo.ReturnPasses (
  ReturnPassId INT IDENTITY(1,1) PRIMARY KEY,
  FamilyId INT NOT NULL,
  SiteId INT NOT NULL,
  RequestedDate DATE NOT NULL,
  CompanionCount INT NOT NULL CHECK (CompanionCount >= 0),
  LogisticsNote NVARCHAR(255) NULL,
  Status NVARCHAR(20) NOT NULL CHECK (Status IN ('borrador', 'enviado')),
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_ReturnPasses_Families FOREIGN KEY (FamilyId) REFERENCES dbo.Families(FamilyId),
  CONSTRAINT FK_ReturnPasses_Sites FOREIGN KEY (SiteId) REFERENCES dbo.Sites(SiteId)
);
GO

CREATE TABLE dbo.CommunityPosts (
  CommunityPostId INT IDENTITY(1,1) PRIMARY KEY,
  FamilyId INT NULL,
  AuthorAlias NVARCHAR(120) NOT NULL,
  Message NVARCHAR(500) NOT NULL,
  Status NVARCHAR(20) NOT NULL CHECK (Status IN ('active', 'reported', 'hidden')),
  ReportCount INT NOT NULL DEFAULT 0,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  ModeratedByUserId INT NULL,
  ModeratedAt DATETIME2 NULL,
  CONSTRAINT FK_CommunityPosts_Families FOREIGN KEY (FamilyId) REFERENCES dbo.Families(FamilyId),
  CONSTRAINT FK_CommunityPosts_Users FOREIGN KEY (ModeratedByUserId) REFERENCES dbo.Users(UserId)
);
GO

CREATE TABLE dbo.AuditEvents (
  AuditEventId INT IDENTITY(1,1) PRIMARY KEY,
  SiteId INT NULL,
  ActorUserId INT NULL,
  ActorFamilyId INT NULL,
  EventType NVARCHAR(80) NOT NULL,
  EntityType NVARCHAR(50) NOT NULL,
  EntityId INT NOT NULL,
  MetadataJson NVARCHAR(MAX) NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_AuditEvents_Sites FOREIGN KEY (SiteId) REFERENCES dbo.Sites(SiteId),
  CONSTRAINT FK_AuditEvents_Users FOREIGN KEY (ActorUserId) REFERENCES dbo.Users(UserId),
  CONSTRAINT FK_AuditEvents_Families FOREIGN KEY (ActorFamilyId) REFERENCES dbo.Families(FamilyId)
);
GO

CREATE INDEX IX_Users_Email ON dbo.Users(Email);
CREATE INDEX IX_Referrals_Site_Status ON dbo.Referrals(SiteId, Status);
CREATE INDEX IX_Families_Site_AdmissionStatus ON dbo.Families(SiteId, AdmissionStatus);
CREATE INDEX IX_FamilyAccess_TicketCode ON dbo.FamilyAccess(TicketCode);
CREATE INDEX IX_Requests_Site_Status ON dbo.Requests(SiteId, Status);
CREATE INDEX IX_Requests_FamilyId ON dbo.Requests(FamilyId);
CREATE INDEX IX_Trips_Site_Shift_Status ON dbo.Trips(SiteId, Shift, Status);
CREATE INDEX IX_VolunteerShifts_Site_Day ON dbo.VolunteerShifts(SiteId, ShiftDay);
CREATE INDEX IX_InventoryItems_Site_Stock ON dbo.InventoryItems(SiteId, Stock);
CREATE INDEX IX_ImpactEvents_Site_Public_CreatedAt ON dbo.ImpactEvents(SiteId, IsPublic, CreatedAt);
CREATE INDEX IX_AuditEvents_EventType_CreatedAt ON dbo.AuditEvents(EventType, CreatedAt);
GO
