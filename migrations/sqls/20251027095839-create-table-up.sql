-- 02-create-all.sql
-- -------------------------------------------------
-- ENUMS (MySQL does not have native ENUM, we use a CHECK)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS `Role` (
  `role` ENUM('SUPER_ADMIN','ADMIN','USER') PRIMARY KEY
) ENGINE=InnoDB;

INSERT IGNORE INTO `Role` (`role`) VALUES ('SUPER_ADMIN'),('ADMIN'),('USER');

-- -------------------------------------------------
-- USER
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS `User` (
  `id`                       INT AUTO_INCREMENT PRIMARY KEY,
  `firstname`                VARCHAR(255) NOT NULL,
  `lastname`                 VARCHAR(255) NOT NULL,
  `email`                    VARCHAR(255) NOT NULL UNIQUE,
  `password`                 VARCHAR(255) NOT NULL,
  `phone_number`             VARCHAR(255) NOT NULL UNIQUE,
  `role`                     ENUM('SUPER_ADMIN','ADMIN','USER') DEFAULT 'USER',
  `avatar`                   VARCHAR(255) NULL,
  `resetPasswordToken`       VARCHAR(255) NULL,
  `resetPasswordTokenExpiry` DATETIME NULL,
  `refreshToken`             VARCHAR(255) NULL,
  `otp`                      VARCHAR(255) NULL,
  `otpExpiresAt`             DATETIME NULL,
  `isVerified`               BOOLEAN DEFAULT FALSE,
  `created_at`               DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`               DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -------------------------------------------------
-- CATEGORY
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS `Category` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `category_name` VARCHAR(255) NOT NULL UNIQUE,
  `category_icon` VARCHAR(255) NOT NULL,
  `created_at`    DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -------------------------------------------------
-- DISTRICT
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS `District` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `district_name` VARCHAR(255) NOT NULL UNIQUE,
  `created_at`    DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -------------------------------------------------
-- VENUE (business)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS `Venue` (
  `id`             INT AUTO_INCREMENT PRIMARY KEY,
  `venue_name`     VARCHAR(255) NOT NULL UNIQUE,
  `venue_address`  VARCHAR(255) NOT NULL,
  `contact_person` VARCHAR(255) NOT NULL,
  `phone_number`   VARCHAR(255) NOT NULL,
  `email`          VARCHAR(255) NOT NULL,
  `pan_vat_number` VARCHAR(255) NULL,
  `active`         BOOLEAN DEFAULT FALSE,
  `created_at`     DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -------------------------------------------------
-- EVENTTYPE
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS `EventType` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `title`      VARCHAR(255) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -------------------------------------------------
-- PRODUCT
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS `Product` (
  `id`               INT AUTO_INCREMENT PRIMARY KEY,
  `title`            VARCHAR(255) NOT NULL,
  `description`      TEXT NOT NULL,
  `address`          VARCHAR(255) NOT NULL,
  `short_description` VARCHAR(255) NULL,
  `is_active`        BOOLEAN DEFAULT TRUE,
  `overall_rating`   FLOAT DEFAULT 0.0,
  `category_id`      INT NOT NULL,
  `districtId`       INT NOT NULL,
  `businessId`       INT NOT NULL,
  `created_at`       DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`category_id`) REFERENCES `Category`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`districtId`)  REFERENCES `District`(`id`)  ON DELETE CASCADE,
  FOREIGN KEY (`businessId`)  REFERENCES `Venue`(`id`)     ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------
-- PRODUCT IMAGE
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS `ProductImage` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `url`        VARCHAR(255) NOT NULL,
  `productId`  INT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------
-- MULTIMEDIA (Photography / Videography)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS `Multimedia` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `multimedia_name` VARCHAR(255) NOT NULL,
  `price`         INT NOT NULL,
  `offerPrice`    INT NULL,
  `description`   TEXT NULL,
  `productId`     INT NULL,
  `created_at`    DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------
-- MUSICAL
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS `Musical` (
  `id`             INT AUTO_INCREMENT PRIMARY KEY,
  `instrument_name` VARCHAR(255) NOT NULL,
  `price`          INT NOT NULL,
  `offerPrice`     INT NULL,
  `description`    TEXT NULL,
  `productId`      INT NULL,
  `created_at`     DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------
-- LUXURY
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS `Luxury` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `luxury_name` VARCHAR(255) NOT NULL,
  `price`       INT NOT NULL,
  `offerPrice`  INT NULL,
  `description` TEXT NULL,
  `productId`   INT NULL,
  `created_at`  DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------
-- ENTERTAINMENT
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS `Entertainment` (
  `id`               INT AUTO_INCREMENT PRIMARY KEY,
  `entertainment_name` VARCHAR(255) NOT NULL,
  `price`            INT NOT NULL,
  `offerPrice`       INT NULL,
  `description`      TEXT NULL,
  `productId`        INT NULL,
  `created_at`       DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------
-- MEETING
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS `Meeting` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `meeting_name` VARCHAR(255) NOT NULL,
  `price`       INT NOT NULL,
  `offerPrice`  INT NULL,
  `description` TEXT NULL,
  `productId`   INT NULL,
  `created_at`  DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------
-- BEAUTY & DECOR
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS `BeautyDecor` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `beauty_name` VARCHAR(255) NOT NULL,
  `price`       INT NOT NULL,
  `offerPrice`  INT NULL,
  `description` TEXT NULL,
  `productId`   INT NULL,
  `created_at`  DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------
-- ADVENTURE
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS `Adventure` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `adventure_name` VARCHAR(255) NOT NULL,
  `price`         INT NOT NULL,
  `offerPrice`    INT NULL,
  `description`   TEXT NULL,
  `productId`     INT NULL,
  `created_at`    DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------
-- PARTY PALACE
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS `PartyPalace` (
  `id`               INT AUTO_INCREMENT PRIMARY KEY,
  `partypalace_name` VARCHAR(255) NOT NULL,
  `price`            INT NOT NULL,
  `offerPrice`       INT NULL,
  `description`      TEXT NULL,
  `productId`        INT NULL,
  `created_at`       DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------
-- CATERING / TENT
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS `CateringTent` (
  `id`           INT AUTO_INCREMENT PRIMARY KEY,
  `catering_name` VARCHAR(255) NOT NULL,
  `price`        INT NOT NULL,
  `offerPrice`   INT NULL,
  `description`  TEXT NULL,
  `productId`    INT NULL,
  `created_at`   DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------
-- EVENT
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS `Event` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `start_date`    DATETIME NOT NULL,
  `end_date`      DATETIME NOT NULL,
  `start_time`    DATETIME NULL,
  `end_time`      DATETIME NULL,
  `is_approved`   BOOLEAN DEFAULT FALSE,
  `is_rejected`   BOOLEAN DEFAULT FALSE,
  `userId`        INT NOT NULL,
  `productId`     INT NOT NULL,
  `approved_by_id` INT NULL,
  `created_at`    DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`userId`)    REFERENCES `User`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approved_by_id`) REFERENCES `User`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -------------------------------------------------
-- EVENT ↔ EVENTTYPE (junction)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS `EventEventType` (
  `eventId`     INT NOT NULL,
  `eventTypeId` INT NOT NULL,
  PRIMARY KEY (`eventId`,`eventTypeId`),
  FOREIGN KEY (`eventId`)     REFERENCES `Event`(`id`)     ON DELETE CASCADE,
  FOREIGN KEY (`eventTypeId`) REFERENCES `EventType`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- -------------------------------------------------
-- PRODUCT RATING
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS `ProductRating` (
  `id`        INT AUTO_INCREMENT PRIMARY KEY,
  `rating`    INT NOT NULL CHECK (`rating` BETWEEN 1 AND 5),
  `review`    TEXT NULL,
  `userId`    INT NOT NULL,
  `productId` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `uq_user_product` (`userId`,`productId`),
  FOREIGN KEY (`userId`)    REFERENCES `User`(`id`)    ON DELETE CASCADE,
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------
-- BLOG
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS `Blog` (
  `id`               INT AUTO_INCREMENT PRIMARY KEY,
  `title`            VARCHAR(255) NOT NULL UNIQUE,
  `short_description` VARCHAR(255) NULL,
  `image`            VARCHAR(255) NOT NULL,
  `description`      TEXT NOT NULL,
  `is_approved`      BOOLEAN NULL,
  `authorId`         INT NULL,
  `approved_by_id`   INT NULL,
  `created_at`       DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`authorId`)       REFERENCES `User`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`approved_by_id`) REFERENCES `User`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -------------------------------------------------
-- CONTACT US (business inquiry)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS `ContactUs` (
  `id`                  INT AUTO_INCREMENT PRIMARY KEY,
  `business_name`       VARCHAR(255) NOT NULL,
  `email`               VARCHAR(255) NOT NULL UNIQUE,
  `address`             VARCHAR(255) NOT NULL,
  `phone_number`        VARCHAR(255) NULL UNIQUE,
  `another_phone_number` VARCHAR(255) NULL UNIQUE,
  `contact_person`      VARCHAR(255) NOT NULL,
  `created_at`          DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -------------------------------------------------
-- OPTIONAL: many-to-many tables for Event ↔ Add-ons
-- (Prisma creates implicit junction tables; we add them explicitly
--  so the schema matches 1-to-1 with the Prisma model)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS `EventMultimedia` (
  `eventId`      INT NOT NULL,
  `multimediaId` INT NOT NULL,
  PRIMARY KEY (`eventId`,`multimediaId`),
  FOREIGN KEY (`eventId`)      REFERENCES `Event`(`id`)       ON DELETE CASCADE,
  FOREIGN KEY (`multimediaId`) REFERENCES `Multimedia`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `EventMusical` (
  `eventId`   INT NOT NULL,
  `musicalId` INT NOT NULL,
  PRIMARY KEY (`eventId`,`musicalId`),
  FOREIGN KEY (`eventId`)   REFERENCES `Event`(`id`)   ON DELETE CASCADE,
  FOREIGN KEY (`musicalId`) REFERENCES `Musical`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `EventLuxury` (
  `eventId`  INT NOT NULL,
  `luxuryId` INT NOT NULL,
  PRIMARY KEY (`eventId`,`luxuryId`),
  FOREIGN KEY (`eventId`)  REFERENCES `Event`(`id`)  ON DELETE CASCADE,
  FOREIGN KEY (`luxuryId`) REFERENCES `Luxury`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `EventEntertainment` (
  `eventId`        INT NOT NULL,
  `entertainmentId` INT NOT NULL,
  PRIMARY KEY (`eventId`,`entertainmentId`),
  FOREIGN KEY (`eventId`)        REFERENCES `Event`(`id`)        ON DELETE CASCADE,
  FOREIGN KEY (`entertainmentId`) REFERENCES `Entertainment`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `EventMeeting` (
  `eventId`   INT NOT NULL,
  `meetingId` INT NOT NULL,
  PRIMARY KEY (`eventId`,`meetingId`),
  FOREIGN KEY (`eventId`)   REFERENCES `Event`(`id`)   ON DELETE CASCADE,
  FOREIGN KEY (`meetingId`) REFERENCES `Meeting`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `EventBeautyDecor` (
  `eventId`       INT NOT NULL,
  `beautyDecorId` INT NOT NULL,
  PRIMARY KEY (`eventId`,`beautyDecorId`),
  FOREIGN KEY (`eventId`)       REFERENCES `Event`(`id`)       ON DELETE CASCADE,
  FOREIGN KEY (`beautyDecorId`) REFERENCES `BeautyDecor`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `EventAdventure` (
  `eventId`     INT NOT NULL,
  `adventureId` INT NOT NULL,
  PRIMARY KEY (`eventId`,`adventureId`),
  FOREIGN KEY (`eventId`)     REFERENCES `Event`(`id`)     ON DELETE CASCADE,
  FOREIGN KEY (`adventureId`) REFERENCES `Adventure`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `EventPartyPalace` (
  `eventId`       INT NOT NULL,
  `partyPalaceId` INT NOT NULL,
  PRIMARY KEY (`eventId`,`partyPalaceId`),
  FOREIGN KEY (`eventId`)       REFERENCES `Event`(`id`)       ON DELETE CASCADE,
  FOREIGN KEY (`partyPalaceId`) REFERENCES `PartyPalace`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `EventCateringTent` (
  `eventId`       INT NOT NULL,
  `cateringTentId` INT NOT NULL,
  PRIMARY KEY (`eventId`,`cateringTentId`),
  FOREIGN KEY (`eventId`)       REFERENCES `Event`(`id`)       ON DELETE CASCADE,
  FOREIGN KEY (`cateringTentId`) REFERENCES `CateringTent`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;