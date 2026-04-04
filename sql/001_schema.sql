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
  siteid INTEGER NOT NULL REFERENCES sites(siteid),
  roleid INTEGER NOT NULL REFERENCES roles(roleid),
  fullname VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  passwordhash VARCHAR(255) NOT NULL,
  isactive BOOLEAN NOT NULL DEFAULT TRUE,
  createdat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE referrals (
  referralid SERIAL PRIMARY KEY,
  siteid INTEGER NOT NULL REFERENCES sites(siteid),
  createdbyuserid INTEGER NOT NULL REFERENCES users(userid),
  referralcode VARCHAR(30) NOT NULL UNIQUE,
  familycode VARCHAR(30) NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL CHECK (status IN ('enviada', 'en_revision', 'aceptada')),
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
  occupiedcount INTEGER NOT NULL DEFAULT 0 CHECK (occupiedcount >= 0),
  isactive BOOLEAN NOT NULL DEFAULT TRUE,
  createdat TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_rooms_site_room UNIQUE (siteid, roomcode)
);

CREATE TABLE families (
  familyid SERIAL PRIMARY KEY,
  referralid INTEGER REFERENCES referrals(referralid),
  siteid INTEGER NOT NULL REFERENCES sites(siteid),
  roomid INTEGER REFERENCES rooms(roomid),
  caregivername VARCHAR(100) NOT NULL,
  familylastname VARCHAR(100) NOT NULL,
  admissionstatus VARCHAR(30) NOT NULL CHECK (admissionstatus IN ('pendiente', 'checkin_completado')),
  idverified BOOLEAN NOT NULL DEFAULT FALSE,
  regulationaccepted BOOLEAN NOT NULL DEFAULT FALSE,
  simplesignature VARCHAR(150),
  checkincompletedat TIMESTAMP,
  createdat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE familyaccess (
  familyaccessid SERIAL PRIMARY KEY,
  familyid INTEGER NOT NULL REFERENCES families(familyid),
  ticketcode VARCHAR(40) NOT NULL UNIQUE,
  qrcode VARCHAR(80) NOT NULL UNIQUE,
  pinhash VARCHAR(255) NOT NULL,
  isactive BOOLEAN NOT NULL DEFAULT TRUE,
  lastloginat TIMESTAMP,
  createdat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE requests (
  requestid SERIAL PRIMARY KEY,
  siteid INTEGER NOT NULL REFERENCES sites(siteid),
  familyid INTEGER NOT NULL REFERENCES families(familyid),
  createdbyuserid INTEGER REFERENCES users(userid),
  createdbysource VARCHAR(20) NOT NULL CHECK (createdbysource IN ('staff', 'family', 'system')),
  title VARCHAR(160) NOT NULL,
  requesttype VARCHAR(30) NOT NULL CHECK (requesttype IN ('transporte', 'kit', 'alimento', 'recepcion')),
  urgency VARCHAR(20) NOT NULL CHECK (urgency IN ('baja', 'media', 'alta')),
  optionalwindow VARCHAR(30),
  priorityscore INTEGER NOT NULL CHECK (priorityscore BETWEEN 0 AND 100),
  prioritylabel VARCHAR(20) NOT NULL CHECK (prioritylabel IN ('baja', 'media', 'alta')),
  priorityreason VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (status IN ('nueva', 'asignada', 'en_proceso', 'resuelta')),
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
  rolename VARCHAR(40) NOT NULL CHECK (rolename IN ('traslados', 'recepcion', 'acompanamiento')),
  shiftday DATE NOT NULL,
  shiftperiod VARCHAR(20) NOT NULL CHECK (shiftperiod IN ('AM', 'PM')),
  availabilitystatus VARCHAR(30) NOT NULL CHECK (availabilitystatus IN ('disponible', 'cupo_limitado', 'no_disponible')),
  hourslogged NUMERIC(5,2) NOT NULL DEFAULT 0,
  createdat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE inventoryitems (
  inventoryitemid SERIAL PRIMARY KEY,
  siteid INTEGER NOT NULL REFERENCES sites(siteid),
  itemcode VARCHAR(30) NOT NULL,
  name VARCHAR(120) NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'pieza',
  stock INTEGER NOT NULL DEFAULT 0,
  minstock INTEGER NOT NULL DEFAULT 0,
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
CREATE INDEX ix_referrals_site_status ON referrals(siteid, status);
CREATE INDEX ix_families_site_admissionstatus ON families(siteid, admissionstatus);
CREATE INDEX ix_familyaccess_ticketcode ON familyaccess(ticketcode);
CREATE INDEX ix_requests_site_status ON requests(siteid, status);
CREATE INDEX ix_requests_familyid ON requests(familyid);
CREATE INDEX ix_requests_assigneduserid_status ON requests(assigneduserid, status);
CREATE INDEX ix_trips_site_shift_status ON trips(siteid, shift, status);
CREATE INDEX ix_trips_familyid ON trips(familyid);
CREATE INDEX ix_volunteershifts_site_day ON volunteershifts(siteid, shiftday);
CREATE INDEX ix_inventoryitems_site_stock ON inventoryitems(siteid, stock);
CREATE INDEX ix_inventorymovements_item_createdat ON inventorymovements(inventoryitemid, createdat);
CREATE INDEX ix_impactevents_site_public_createdat ON impactevents(siteid, ispublic, createdat);
CREATE INDEX ix_returnpasses_familyid ON returnpasses(familyid);
CREATE INDEX ix_communityposts_status_createdat ON communityposts(status, createdat);
CREATE INDEX ix_auditevents_eventtype_createdat ON auditevents(eventtype, createdat);
