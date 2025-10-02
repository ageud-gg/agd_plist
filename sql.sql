CREATE TABLE IF NOT EXISTS `police_grade_colors` (
  `grade_min` INT(11) NOT NULL,
  `grade_max` INT(11) NOT NULL,
  `color` VARCHAR(16) DEFAULT '#ffffff',
  `grade_name` VARCHAR(50) DEFAULT 'Unknown',
  PRIMARY KEY (`grade_min`, `grade_max`)
);

CREATE TABLE IF NOT EXISTS `police_settings` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `citizenid` VARCHAR(64) NOT NULL,
  `callsign` VARCHAR(16) DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `citizenid` (`citizenid`)
);
