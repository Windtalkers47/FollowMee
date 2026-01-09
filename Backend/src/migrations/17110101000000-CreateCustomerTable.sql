CREATE TABLE `customers` (
  `customerId` char(36) NOT NULL,
  `customerName` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `customerLastName` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `customerEmail` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `customerPhone1` varchar(20) COLLATE utf8_unicode_ci DEFAULT NULL,
  `customerPhone2` varchar(20) COLLATE utf8_unicode_ci DEFAULT NULL,
  `customerFacebook` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `customerInstagram` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `customerTikTok` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `customerLine` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `customerX` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` timestamp(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` timestamp(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`customerId`),
  UNIQUE KEY `IDX_customer_email` (`customerEmail`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
