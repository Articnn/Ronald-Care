DROP TABLE IF EXISTS volunteeralerts CASCADE;
DROP TABLE IF EXISTS appnotifications CASCADE;
DROP TABLE IF EXISTS volunteerchangerequests CASCADE;
DROP TABLE IF EXISTS volunteernotificationreads CASCADE;
DROP TABLE IF EXISTS volunteertasks CASCADE;
DROP TABLE IF EXISTS stafftasks CASCADE;
DROP TABLE IF EXISTS staffprofiles CASCADE;
DROP TABLE IF EXISTS auditevents CASCADE;
DROP TABLE IF EXISTS communityposts CASCADE;
DROP TABLE IF EXISTS returnpasses CASCADE;
DROP TABLE IF EXISTS impactevents CASCADE;
DROP TABLE IF EXISTS inventorymovements CASCADE;
DROP TABLE IF EXISTS inventoryitems CASCADE;
DROP TABLE IF EXISTS volunteershifts CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS requests CASCADE;
DROP TABLE IF EXISTS familyaccess CASCADE;
DROP TABLE IF EXISTS families CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS sites CASCADE;

CREATE TABLE sites (
  siteid SERIAL PRIMARY KEY,
  sitecode VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  isactive BOOLEAN NOT NULL DEFAULT TRUE,
  createdat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
  roleid SERIAL PRIMARY KEY,
  rolecode VARCHAR(30) NOT NULL UNIQUE,
  displayname VARCHAR(60) NOT NULL
);

CREATE TABLE users (
  userid SERIAL PRIMARY KEY,
  siteid INTEGER REFERENCES sites(siteid),
  roleid INTEGER NOT NULL REFERENCES roles(roleid),
  fullname VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  passwordhash VARCHAR(255) NOT NULL,
  isactive BOOLEAN NOT NULL DEFAULT TRUE,
  createdat TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE referrals (
  referralid SERIAL PRIMARY KEY,
  siteid INTEGER NOT NULL REFERENCES sites(siteid),
  createdbyuserid INTEGER NOT NULL REFERENCES users(userid),
  caregivername VARCHAR(100) NOT NULL,
  familylastname VARCHAR(100) NOT NULL,
  referralcode VARCHAR(30) NOT NULL UNIQUE,
  familycode VARCHAR(30) NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL CHECK (status IN ('enviada', 'en_revision', 'aceptada')),
  admissionstage VARCHAR(30) NOT NULL DEFAULT 'referencia' CHECK (admissionstage IN ('referencia', 'borrador_extraido', 'expediente_armado', 'aprobada', 'lista_espera')),
  childname VARCHAR(120),
  diagnosis VARCHAR(255),
  originhospital VARCHAR(160),
  origincity VARCHAR(100),
  requesttemplatejson TEXT,
  socialworkername VARCHAR(120),
  familycontactphone VARCHAR(40),
  dossiersummary TEXT,
  assignedsiteid INTEGER REFERENCES sites(siteid),
  reservedroomid INTEGER REFERENCES rooms(roomid),
  approvedat TIMESTAMP,
  waitlistenteredat TIMESTAMP,
  transporteventready BOOLEAN NOT NULL DEFAULT FALSE,
  arrivaldate DATE NOT NULL,
  companioncount INTEGER NOT NULL CHECK (companioncount >= 0),
  logisticsnote VARCHAR(500),
  eligibilityconfirmed BOOLEAN NOT NULL DEFAULT FALSE,
  createdat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE rooms (
  roomid SERIAL PRIMARY KEY,
  siteid INTEGER NOT NULL REFERENCES sites(siteid),
  roomcode VARCHAR(20) NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  roomtype VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (roomtype IN ('normal', 'especial')),
  occupiedcount INTEGER NOT NULL DEFAULT 0 CHECK (occupiedcount >= 0),
  roomstatus VARCHAR(20) NOT NULL DEFAULT 'disponible' CHECK (roomstatus IN ('disponible', 'ocupada', 'reservada', 'mantenimiento')),
  availableat TIMESTAMP,
  roomnote VARCHAR(255),
  isactive BOOLEAN NOT NULL DEFAULT TRUE,
  createdat TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_rooms_site_room UNIQUE (siteid, roomcode)
);

CREATE TABLE families (
  familyid SERIAL PRIMARY KEY,
  referralid INTEGER UNIQUE REFERENCES referrals(referralid),
  siteid INTEGER NOT NULL REFERENCES sites(siteid),
  roomid INTEGER REFERENCES rooms(roomid),
  plannedroomid INTEGER REFERENCES rooms(roomid),
  caregivername VARCHAR(100) NOT NULL,
  familylastname VARCHAR(100) NOT NULL,
  staydays INTEGER NOT NULL DEFAULT 3 CHECK (staydays > 0),
  plannedcheckoutdate DATE,
  automationstatus VARCHAR(30) NOT NULL DEFAULT 'pendiente' CHECK (automationstatus IN ('pendiente', 'sin_cupo', 'preparacion', 'reservada', 'ocupada', 'checkout_completado')),
  admissionstatus VARCHAR(30) NOT NULL CHECK (admissionstatus IN ('pendiente', 'checkin_completado')),
  idverified BOOLEAN NOT NULL DEFAULT FALSE,
  regulationaccepted BOOLEAN NOT NULL DEFAULT FALSE,
  simplesignature VARCHAR(150),
  checkincompletedat TIMESTAMP,
  createdat TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE familyaccess (
  familyaccessid SERIAL PRIMARY KEY,
  familyid INTEGER NOT NULL REFERENCES families(familyid),
  ticketcode VARCHAR(40) NOT NULL UNIQUE,
  qrcode VARCHAR(80) NOT NULL UNIQUE,
  pinhash VARCHAR(255) NOT NULL,
  isactive BOOLEAN NOT NULL DEFAULT TRUE,
  lastloginat TIMESTAMP,
  createdat TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE seguimiento_clinico (
  followupid SERIAL PRIMARY KEY,
  familyid INTEGER NOT NULL REFERENCES families(familyid) ON DELETE CASCADE,
  referralid INTEGER REFERENCES referrals(referralid) ON DELETE SET NULL,
  requestid INTEGER REFERENCES requests(requestid) ON DELETE SET NULL,
  siteid INTEGER NOT NULL REFERENCES sites(siteid),
  recordedbyuserid INTEGER REFERENCES users(userid),
  clinicname VARCHAR(160),
  feedbackmessage TEXT NOT NULL,
  previouscheckoutdate DATE,
  estimatedcheckoutdate DATE,
  recordedat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE requests (
  requestid SERIAL PRIMARY KEY,
  siteid INTEGER NOT NULL REFERENCES sites(siteid),
  familyid INTEGER REFERENCES families(familyid),
  createdbyuserid INTEGER REFERENCES users(userid),
  createdbysource VARCHAR(20) NOT NULL CHECK (createdbysource IN ('staff', 'family', 'system')),
  title VARCHAR(160) NOT NULL,
  requesttype VARCHAR(30) NOT NULL CHECK (requesttype IN ('transporte', 'kit', 'alimento', 'recepcion')),
  urgency VARCHAR(20) NOT NULL CHECK (urgency IN ('baja', 'media', 'alta')),
  optionalwindow VARCHAR(30),
  priorityscore INTEGER NOT NULL CHECK (priorityscore BETWEEN 0 AND 100),
  prioritylabel VARCHAR(20) NOT NULL CHECK (prioritylabel IN ('baja', 'media', 'alta')),
  priorityreason VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (status IN ('referencia', 'borrador_extraido', 'nueva', 'asignada', 'en_proceso', 'resuelta')),
  referralid INTEGER REFERENCES referrals(referralid) ON DELETE SET NULL,
  documentoreferenciaurl VARCHAR(255),
  assignedrole VARCHAR(30) CHECK (assignedrole IN ('staff', 'volunteer')),
  assigneduserid INTEGER REFERENCES users(userid),
  assigneddisplayname VARCHAR(120),
  waitingstartedat TIMESTAMP NOT NULL DEFAULT NOW(),
  assignedat TIMESTAMP,
  resolvedat TIMESTAMP,
  createdat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE trips (
  tripid SERIAL PRIMARY KEY,
  siteid INTEGER NOT NULL REFERENCES sites(siteid),
  familyid INTEGER NOT NULL REFERENCES families(familyid),
  relatedrequestid INTEGER REFERENCES requests(requestid),
  destination VARCHAR(160) NOT NULL,
  shift VARCHAR(2) NOT NULL CHECK (shift IN ('AM', 'PM')),
  assigneduserid INTEGER REFERENCES users(userid),
  assigneddisplayname VARCHAR(120),
  status VARCHAR(30) NOT NULL CHECK (status IN ('pendiente', 'en_curso', 'finalizado')),
  startedat TIMESTAMP,
  endedat TIMESTAMP,
  durationminutes INTEGER,
  createdat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE volunteershifts (
  volunteershiftid SERIAL PRIMARY KEY,
  siteid INTEGER NOT NULL REFERENCES sites(siteid),
  userid INTEGER REFERENCES users(userid),
  volunteername VARCHAR(120) NOT NULL,
  volunteertype VARCHAR(30) NOT NULL CHECK (volunteertype IN ('individual', 'escolar', 'empresarial')),
  rolename VARCHAR(40) NOT NULL CHECK (rolename IN ('traslados', 'recepcion', 'acompanamiento', 'cocina', 'lavanderia', 'limpieza')),
  shiftday DATE NOT NULL,
  workdays TEXT NOT NULL DEFAULT '',
  starttime VARCHAR(5) NOT NULL DEFAULT '08:00',
  endtime VARCHAR(5) NOT NULL DEFAULT '14:00',
  shiftperiod VARCHAR(20) NOT NULL CHECK (shiftperiod IN ('AM', 'PM')),
  shiftlabel VARCHAR(20) NOT NULL DEFAULT 'manana' CHECK (shiftlabel IN ('manana', 'tarde', 'noche')),
  availabilitystatus VARCHAR(30) NOT NULL CHECK (availabilitystatus IN ('disponible', 'cupo_limitado', 'no_disponible')),
  hourslogged NUMERIC(5,2) NOT NULL DEFAULT 0,
  createdat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE volunteertasks (
  volunteertaskid SERIAL PRIMARY KEY,
  siteid INTEGER NOT NULL REFERENCES sites(siteid),
  volunteeruserid INTEGER NOT NULL REFERENCES users(userid),
  assignedbyuserid INTEGER NOT NULL REFERENCES users(userid),
  familyid INTEGER REFERENCES families(familyid),
  relatedrequestid INTEGER REFERENCES requests(requestid),
  relatedroomid INTEGER REFERENCES rooms(roomid),
  title VARCHAR(160) NOT NULL,
  tasktype VARCHAR(40) NOT NULL CHECK (tasktype IN ('cocina', 'lavanderia', 'traslados', 'acompanamiento', 'recepcion', 'limpieza', 'inventario')),
  shiftperiod VARCHAR(20) NOT NULL CHECK (shiftperiod IN ('AM', 'PM')),
  taskday DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pendiente', 'en_proceso', 'completada')),
  notes VARCHAR(255),
  createdat TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE stafftasks (
  stafftaskid SERIAL PRIMARY KEY,
  siteid INTEGER NOT NULL REFERENCES sites(siteid),
  referralid INTEGER REFERENCES referrals(referralid) ON DELETE SET NULL,
  familyid INTEGER REFERENCES families(familyid) ON DELETE SET NULL,
  assigneduserid INTEGER REFERENCES users(userid),
  createdbyuserid INTEGER REFERENCES users(userid),
  title VARCHAR(160) NOT NULL,
  instructions TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('baja', 'media', 'alta')),
  suggestedroomcode VARCHAR(20),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pendiente', 'en_proceso', 'completada')),
  createdat TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE volunteernotificationreads (
  notificationreadid SERIAL PRIMARY KEY,
  volunteertaskid INTEGER NOT NULL REFERENCES volunteertasks(volunteertaskid) ON DELETE CASCADE,
  userid INTEGER NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
  readat TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (volunteertaskid, userid)
);

CREATE TABLE appnotifications (
  notificationid SERIAL PRIMARY KEY,
  siteid INTEGER REFERENCES sites(siteid),
  userid INTEGER NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL,
  title VARCHAR(160) NOT NULL,
  message VARCHAR(255) NOT NULL,
  relatedentitytype VARCHAR(50),
  relatedentityid INTEGER,
  isread BOOLEAN NOT NULL DEFAULT FALSE,
  createdat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE staffprofiles (
  staffprofileid SERIAL PRIMARY KEY,
  siteid INTEGER NOT NULL REFERENCES sites(siteid),
  userid INTEGER NOT NULL UNIQUE REFERENCES users(userid) ON DELETE CASCADE,
  workarea VARCHAR(40) NOT NULL CHECK (workarea IN ('recepcion', 'checkin', 'habitaciones', 'inventario', 'coordinacion', 'analitica', 'apoyo_familiar')),
  workdays TEXT NOT NULL DEFAULT '',
  starttime VARCHAR(5) NOT NULL DEFAULT '08:00',
  endtime VARCHAR(5) NOT NULL DEFAULT '16:00',
  shiftperiod VARCHAR(20) NOT NULL CHECK (shiftperiod IN ('AM', 'PM')),
  shiftlabel VARCHAR(20) NOT NULL DEFAULT 'manana' CHECK (shiftlabel IN ('manana', 'tarde', 'noche')),
  availabilitystatus VARCHAR(30) NOT NULL CHECK (availabilitystatus IN ('disponible', 'cupo_limitado', 'no_disponible')),
  hourslogged NUMERIC(5,2) NOT NULL DEFAULT 0,
  createdat TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE volunteerchangerequests (
  volunteerchangerequestid SERIAL PRIMARY KEY,
  siteid INTEGER NOT NULL REFERENCES sites(siteid),
  volunteeruserid INTEGER NOT NULL REFERENCES users(userid),
  requestedshiftperiod VARCHAR(20) CHECK (requestedshiftperiod IN ('AM', 'PM')),
  requestedtasktype VARCHAR(40) CHECK (requestedtasktype IN ('cocina', 'lavanderia', 'traslados', 'acompanamiento', 'recepcion', 'limpieza', 'inventario')),
  requestedrolename VARCHAR(40) CHECK (requestedrolename IN ('traslados', 'recepcion', 'acompanamiento', 'cocina', 'lavanderia', 'limpieza')),
  requestedworkdays VARCHAR(120),
  requestedstarttime VARCHAR(5),
  requestedendtime VARCHAR(5),
  requestedshiftlabel VARCHAR(20) CHECK (requestedshiftlabel IN ('manana', 'tarde', 'noche')),
  reason VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pendiente', 'aprobada', 'rechazada')),
  reviewedbyuserid INTEGER REFERENCES users(userid),
  createdat TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE inventoryitems (
  inventoryitemid SERIAL PRIMARY KEY,
  siteid INTEGER NOT NULL REFERENCES sites(siteid),
  itemcode VARCHAR(30) NOT NULL,
  name VARCHAR(120) NOT NULL,
  itemcategory VARCHAR(20) NOT NULL DEFAULT 'kit' CHECK (itemcategory IN ('kit', 'cocina', 'limpieza', 'otro')),
  unit VARCHAR(20) NOT NULL DEFAULT 'pieza',
  stock INTEGER NOT NULL DEFAULT 0,
  minstock INTEGER NOT NULL DEFAULT 0,
  expirydate DATE,
  createdat TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_inventoryitems_sitecode UNIQUE (siteid, itemcode)
);

CREATE TABLE inventorymovements (
  inventorymovementid SERIAL PRIMARY KEY,
  inventoryitemid INTEGER NOT NULL REFERENCES inventoryitems(inventoryitemid),
  siteid INTEGER NOT NULL REFERENCES sites(siteid),
  performedbyuserid INTEGER REFERENCES users(userid),
  movementtype VARCHAR(10) NOT NULL CHECK (movementtype IN ('in', 'out')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason VARCHAR(255) NOT NULL,
  createdat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE inventoryreports (
  inventoryreportid SERIAL PRIMARY KEY,
  siteid INTEGER NOT NULL REFERENCES sites(siteid),
  volunteeruserid INTEGER NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
  itemcategory VARCHAR(20) NOT NULL CHECK (itemcategory IN ('kit', 'cocina', 'limpieza', 'lavanderia', 'recepcion')),
  title VARCHAR(160) NOT NULL,
  detail VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'atendido')),
  createdat TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE impactevents (
  impacteventid SERIAL PRIMARY KEY,
  siteid INTEGER NOT NULL REFERENCES sites(siteid),
  eventtype VARCHAR(50) NOT NULL,
  sourceentitytype VARCHAR(50) NOT NULL,
  sourceentityid INTEGER NOT NULL,
  publictitle VARCHAR(150) NOT NULL,
  publicdetail VARCHAR(400) NOT NULL,
  ispublic BOOLEAN NOT NULL DEFAULT TRUE,
  createdat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE returnpasses (
  returnpassid SERIAL PRIMARY KEY,
  familyid INTEGER NOT NULL REFERENCES families(familyid),
  siteid INTEGER NOT NULL REFERENCES sites(siteid),
  requesteddate DATE NOT NULL,
  companioncount INTEGER NOT NULL CHECK (companioncount >= 0),
  logisticsnote VARCHAR(255),
  status VARCHAR(20) NOT NULL CHECK (status IN ('borrador', 'enviado')),
  createdat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE communityposts (
  communitypostid SERIAL PRIMARY KEY,
  familyid INTEGER REFERENCES families(familyid),
  authoralias VARCHAR(120) NOT NULL,
  message VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'reported', 'hidden')),
  reportcount INTEGER NOT NULL DEFAULT 0,
  createdat TIMESTAMP NOT NULL DEFAULT NOW(),
  moderatedbyuserid INTEGER REFERENCES users(userid),
  moderatedat TIMESTAMP
);

CREATE TABLE auditevents (
  auditeventid SERIAL PRIMARY KEY,
  siteid INTEGER REFERENCES sites(siteid),
  actoruserid INTEGER REFERENCES users(userid),
  actorfamilyid INTEGER REFERENCES families(familyid),
  eventtype VARCHAR(80) NOT NULL,
  entitytype VARCHAR(50) NOT NULL,
  entityid INTEGER NOT NULL,
  metadatajson TEXT,
  createdat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_users_email ON users(email);
CREATE INDEX ix_users_site_role ON users(siteid, roleid);
CREATE INDEX ix_referrals_site_status ON referrals(siteid, status);
CREATE INDEX ix_referrals_stage_site ON referrals(admissionstage, COALESCE(assignedsiteid, siteid));
CREATE INDEX ix_families_site_admissionstatus ON families(siteid, admissionstatus);
CREATE INDEX ix_families_site_checkoutstatus ON families(siteid, plannedcheckoutdate, automationstatus);
CREATE INDEX ix_seguimiento_clinico_family_recordedat ON seguimiento_clinico(familyid, recordedat DESC);
CREATE INDEX ix_familyaccess_ticketcode ON familyaccess(ticketcode);
CREATE INDEX ix_requests_site_status ON requests(siteid, status);
CREATE INDEX ix_requests_familyid ON requests(familyid);
CREATE INDEX ix_requests_assigneduserid_status ON requests(assigneduserid, status);
CREATE INDEX ix_trips_site_shift_status ON trips(siteid, shift, status);
CREATE INDEX ix_trips_familyid ON trips(familyid);
CREATE INDEX ix_rooms_site_roomtype ON rooms(siteid, roomtype);
CREATE INDEX ix_volunteershifts_site_day ON volunteershifts(siteid, shiftday);
CREATE INDEX ix_volunteertasks_site_day ON volunteertasks(siteid, taskday);
CREATE INDEX ix_volunteertasks_volunteer_status ON volunteertasks(volunteeruserid, status);
CREATE INDEX ix_stafftasks_site_status_createdat ON stafftasks(siteid, status, createdat DESC);
CREATE INDEX ix_volunteernotificationreads_userid ON volunteernotificationreads(userid);
CREATE INDEX ix_appnotifications_userid_isread_createdat ON appnotifications(userid, isread, createdat);
CREATE INDEX ix_staffprofiles_siteid_workarea ON staffprofiles(siteid, workarea);
CREATE INDEX ix_volunteerchanges_volunteer_status ON volunteerchangerequests(volunteeruserid, status);
CREATE INDEX ix_inventoryitems_site_stock ON inventoryitems(siteid, stock);
CREATE INDEX ix_inventoryitems_site_category_expiry ON inventoryitems(siteid, itemcategory, expirydate);
CREATE INDEX ix_inventorymovements_item_createdat ON inventorymovements(inventoryitemid, createdat);
CREATE INDEX ix_inventoryreports_site_status_createdat ON inventoryreports(siteid, status, createdat DESC);
CREATE INDEX ix_impactevents_site_public_createdat ON impactevents(siteid, ispublic, createdat);
CREATE INDEX ix_returnpasses_familyid ON returnpasses(familyid);
CREATE INDEX ix_communityposts_status_createdat ON communityposts(status, createdat);
CREATE INDEX ix_auditevents_eventtype_createdat ON auditevents(eventtype, createdat);

