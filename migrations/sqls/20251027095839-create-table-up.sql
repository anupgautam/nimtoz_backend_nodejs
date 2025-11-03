-- 20251027095839-create-table-up.sql
-- -------------------------------------------------
-- ROLES (Using VARCHAR with trigger for MariaDB compatibility)
-- -------------------------------------------------
CREATE TABLE `Role` (
  `role` VARCHAR(50) PRIMARY KEY
) ENGINE=InnoDB;

INSERT IGNORE INTO `Role` (`role`) VALUES ('SUPER_ADMIN'), ('ADMIN'), ('USER');


-- CREATE TRIGGER check_role
-- BEFORE INSERT ON `Role`
-- FOR EACH ROW
-- BEGIN
--   IF NEW.role NOT IN ('SUPER_ADMIN', 'ADMIN', 'USER') THEN
--     SIGNAL SQLSTATE '45000'
--     SET MESSAGE_TEXT = 'Role must be SUPER_ADMIN, ADMIN, or USER';
--   END IF;
-- END;

-- -------------------------------------------------
-- USER
-- -------------------------------------------------
CREATE TABLE `User` (
  `id`                       INT AUTO_INCREMENT PRIMARY KEY,
  `firstname`                VARCHAR(255) NOT NULL,
  `lastname`                 VARCHAR(255) NOT NULL,
  `email`                    VARCHAR(255) NOT NULL UNIQUE,
  `password`                 VARCHAR(255) NOT NULL,
  `phone_number`             VARCHAR(255) NOT NULL UNIQUE,
  `role`                     VARCHAR(50) DEFAULT 'USER',
  `avatar`                   VARCHAR(255) NULL,
  `resetPasswordToken`       VARCHAR(255) NULL,
  `resetPasswordTokenExpiry` DATETIME NULL,
  `refreshToken`             VARCHAR(255) NULL,
  `otp`                      VARCHAR(255) NULL,
  `otpExpiresAt`             DATETIME NULL,
  `isVerified`               BOOLEAN DEFAULT FALSE,
  `created_at`               DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`               DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`role`) REFERENCES `Role`(`role`) ON DELETE RESTRICT
) ENGINE=InnoDB;
-- -------------------------------------------------
-- CATEGORY
-- -------------------------------------------------
CREATE TABLE `Category` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `category_name` VARCHAR(255) NOT NULL UNIQUE,
  `category_icon` VARCHAR(255) NOT NULL,
  `created_at`    DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -------------------------------------------------
-- DISTRICT
-- -------------------------------------------------
CREATE TABLE `District` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `district_name` VARCHAR(255) NOT NULL UNIQUE,
  `created_at`    DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -------------------------------------------------
-- VENUE (business)
-- -------------------------------------------------
CREATE TABLE `Venue` (
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
CREATE TABLE `EventType` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `title`      VARCHAR(255) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -------------------------------------------------
-- PRODUCT
-- -------------------------------------------------
CREATE TABLE `Product` (
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
  FOREIGN KEY (`districtId`)  REFERENCES `District`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`businessId`)  REFERENCES `Venue`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------
-- PRODUCT IMAGE
-- -------------------------------------------------
CREATE TABLE `ProductImage` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `url`        VARCHAR(255) NOT NULL,
  `productId`  INT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------
-- Sub Product
-- -------------------------------------------------
-- CREATE TABLE `SubProduct` (
--   `id`            INT AUTO_INCREMENT PRIMARY KEY,
--   `title` VARCHAR(255) NOT NULL,
--   `price`         INT NOT NULL,
--   `offerPrice`    INT NULL,
--   `description`   TEXT NULL,
--   `productId`     INT NULL,
--   `created_at`    DATETIME DEFAULT CURRENT_TIMESTAMP,
--   `updated_at`    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--   FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE
-- ) ENGINE=InnoDB;

-- -------------------------------------------------
-- MULTIMEDIA (Photography / Videography)
-- -------------------------------------------------
CREATE TABLE `Multimedia` (
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
CREATE TABLE `Musical` (
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
CREATE TABLE `Luxury` (
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
CREATE TABLE `Entertainment` (
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
CREATE TABLE `Meeting` (
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
CREATE TABLE `BeautyDecor` (
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
CREATE TABLE `Adventure` (
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
CREATE TABLE `PartyPalace` (
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
CREATE TABLE `CateringTent` (
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
CREATE TABLE `Event` (
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
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approved_by_id`) REFERENCES `User`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -------------------------------------------------
-- EVENT ↔ EVENTTYPE (junction)
-- -------------------------------------------------
CREATE TABLE `EventEventType` (
  `eventId`     INT NOT NULL,
  `eventTypeId` INT NOT NULL,
  PRIMARY KEY (`eventId`, `eventTypeId`),
  FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`eventTypeId`) REFERENCES `EventType`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- -------------------------------------------------
-- PRODUCT RATING
-- -------------------------------------------------
CREATE TABLE `ProductRating` (
  `id`        INT AUTO_INCREMENT PRIMARY KEY,
  `rating`    INT NOT NULL,
  `review`    TEXT NULL,
  `userId`    INT NOT NULL,
  `productId` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_user_product` (`userId`, `productId`),
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -- Trigger for rating validation

-- CREATE TRIGGER check_rating
-- BEFORE INSERT ON `ProductRating`
-- FOR EACH ROW
-- BEGIN
--   IF NEW.rating < 1 OR NEW.rating > 5 THEN
--     SIGNAL SQLSTATE '45000'
--     SET MESSAGE_TEXT = 'Rating must be between 1 and 5';
--   END IF;
-- END 
-- ;

-- -------------------------------------------------
-- BLOG
-- -------------------------------------------------
CREATE TABLE `Blog` (
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
  FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`approved_by_id`) REFERENCES `User`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -------------------------------------------------
-- CONTACT US (business inquiry)
-- -------------------------------------------------
CREATE TABLE `ContactUs` (
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
-- -------------------------------------------------
CREATE TABLE `EventMultimedia` (
  `eventId`      INT NOT NULL,
  `multimediaId` INT NOT NULL,
  PRIMARY KEY (`eventId`, `multimediaId`),
  FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`multimediaId`) REFERENCES `Multimedia`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `EventMusical` (
  `eventId`   INT NOT NULL,
  `musicalId` INT NOT NULL,
  PRIMARY KEY (`eventId`, `musicalId`),
  FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`musicalId`) REFERENCES `Musical`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `EventLuxury` (
  `eventId`  INT NOT NULL,
  `luxuryId` INT NOT NULL,
  PRIMARY KEY (`eventId`, `luxuryId`),
  FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`luxuryId`) REFERENCES `Luxury`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `EventEntertainment` (
  `eventId`        INT NOT NULL,
  `entertainmentId` INT NOT NULL,
  PRIMARY KEY (`eventId`, `entertainmentId`),
  FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`entertainmentId`) REFERENCES `Entertainment`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `EventMeeting` (
  `eventId`   INT NOT NULL,
  `meetingId` INT NOT NULL,
  PRIMARY KEY (`eventId`, `meetingId`),
  FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`meetingId`) REFERENCES `Meeting`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `EventBeautyDecor` (
  `eventId`       INT NOT NULL,
  `beautyDecorId` INT NOT NULL,
  PRIMARY KEY (`eventId`, `beautyDecorId`),
  FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`beautyDecorId`) REFERENCES `BeautyDecor`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `EventAdventure` (
  `eventId`     INT NOT NULL,
  `adventureId` INT NOT NULL,
  PRIMARY KEY (`eventId`, `adventureId`),
  FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`adventureId`) REFERENCES `Adventure`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `EventPartyPalace` (
  `eventId`       INT NOT NULL,
  `partyPalaceId` INT NOT NULL,
  PRIMARY KEY (`eventId`, `partyPalaceId`),
  FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`partyPalaceId`) REFERENCES `PartyPalace`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `EventCateringTent` (
  `eventId`       INT NOT NULL,
  `cateringTentId` INT NOT NULL,
  PRIMARY KEY (`eventId`, `cateringTentId`),
  FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`cateringTentId`) REFERENCES `CateringTent`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;