-- --------------------------------------------------------
-- 호스트:                          localhost
-- 서버 버전:                        8.4.0 - MySQL Community Server - GPL
-- 서버 OS:                        Win64
-- HeidiSQL 버전:                  12.8.0.6908
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- 테이블 mybank.accounts 구조 내보내기
CREATE TABLE IF NOT EXISTS `accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `account_alias` varchar(255) NOT NULL,
  `account_number` varchar(255) NOT NULL,
  `account_balance` decimal(18,2) NOT NULL DEFAULT '0.00',
  `account_pw` varchar(255) NOT NULL,
  `salt` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `account_number` (`account_number`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `accounts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 mybank.accounts:~14 rows (대략적) 내보내기
INSERT INTO `accounts` (`id`, `user_id`, `account_alias`, `account_number`, `account_balance`, `account_pw`, `salt`, `created_at`, `updated_at`) VALUES
	(21, 3, '계좌1', '473402100405', 86254710.99, 'c93827a3fa758724968f3e68836f8998a947eb30ec4cdfdf90a673d9dc113e7a', '7d1d12dc17eef5ea03a7dbbebc3bc107', '2024-07-07 13:50:38', '2024-07-08 05:35:56'),
	(22, 4, 'qqq계좌', '287856788463', 47999667.00, '1834dfcfe16346db00d5243066b89b43a8381521a6a9d10f5d03c035a031bce1', 'a4b2068287c6d22c5e368ba29e3a95cb', '2024-07-07 13:56:32', '2024-07-07 14:34:34'),
	(23, 3, '계좌2', '275172212446', 6980200.00, 'd0432a45ff5523e8a03d2cae015f45de77ffa966d58746ed3fe0c56e781ed3b5', '101e3b43c596020c8b8714c2306b9870', '2024-07-07 14:55:11', '2024-07-07 14:57:45'),
	(24, 2, 'hello', '952544220211', 100000.00, '649438206e9e97532d02548ab3272f4d7e6b3f9c381948023414bedad34689da', '7317c7750647295d7311280054bdec28', '2024-07-08 01:45:24', '2024-07-08 02:50:02'),
	(25, 2, 'hello2', '873702267922', 335708.00, '0d5517c38acf7fba3867bb28c50a71e7ea3bb33ad0a17dc38fd5af75492e89fa', '57e35c09b5abb0c28823b7cfcd7f67f0', '2024-07-08 01:54:33', '2024-07-08 02:27:24'),
	(26, 2, 'hello3', '498705539316', 100000.00, '1d7d30f274037456b3096dcdc8959391ae6f4131d5f05e578fef3a1fdf8e791f', '41b014a56451ddeb8ddd2d048e5e3da3', '2024-07-08 01:56:29', '2024-07-08 01:56:29'),
	(27, 11, 'qwer', '620056349927', 31000.00, '53a2141a9c29a02e16774692aadad9b603e4d3142c2c1c138a73f2e831b1f413', 'c1c60a3cef2cdbfffffd2fccc5f4d8f7', '2024-07-08 01:59:46', '2024-07-08 02:13:07'),
	(28, 11, 'qwer1', '174683042871', 100.00, 'a43a24aff6f0a802e8e6390de355bf46e07e5e41b669487423af10ed199856f0', 'eeede18c01483e5ca07df2c68a863122', '2024-07-08 02:00:55', '2024-07-08 02:00:55'),
	(29, 11, 'qwer2', '555598612211', 10000.00, '10cf59260274cfbdd87b735a4979331bf92e04a33f5b49c21d7d9bee0912a71e', '60d09eb346e04b015695bb9c9f0d461e', '2024-07-08 02:02:41', '2024-07-08 02:02:41'),
	(30, 11, 'qwer3', '853280092296', 10000.00, '826cb900af5fe0e508dbd9f51e0023c6fbf3e0610acbf00ab58dc231f6acddc6', 'eedeffce20420be7bc44159c4c1001e3', '2024-07-08 02:06:50', '2024-07-08 02:06:50'),
	(31, 2, 'hello4', '307856489143', 1000000.00, '65ed8956291cd5cba833ac420bfff80d65f56ba156c2649c7df8b8b469917e9a', '100e71689b395fd8bcef55f89c153918', '2024-07-08 02:10:42', '2024-07-08 02:10:42'),
	(32, 17, '안녕1234', '458253016255', 99999999.99, 'bec4cd2613e2d38935863a3373f93eecb93ad4fa91de2ec07efccd72a75ac4bc', 'cd56241f8605865d9bb5b8765d0cb563', '2024-07-08 02:30:06', '2024-07-08 02:30:06'),
	(33, 20, '계좌111', '759960019379', 5586954.00, '0e1216a8ea2488e6163b36589d834ab24cc743081f07bc4811f4f5e7ebffb384', '0140caffa37c6a0265def16add49bd75', '2024-07-08 05:34:36', '2024-07-08 05:49:13'),
	(34, 20, '계좌22', '165912974719', 60000000.00, 'd585e6c600f6e92e95843f9cd1ccf0dbba4a60a5c6622d0bb732c244fa52e278', 'a6719091976d9f95bbfd40e2e9f303f9', '2024-07-08 06:13:19', '2024-07-08 06:13:19');

-- 테이블 mybank.real_estate 구조 내보내기
CREATE TABLE IF NOT EXISTS `real_estate` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `apartment` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `city` varchar(255) NOT NULL,
  `area` varchar(50) NOT NULL,
  `imagepath` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `selling_price` decimal(18,2) NOT NULL,
  `jeonse_price` decimal(18,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `real_estate_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=71 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 mybank.real_estate:~21 rows (대략적) 내보내기
INSERT INTO `real_estate` (`id`, `user_id`, `apartment`, `address`, `city`, `area`, `imagepath`, `selling_price`, `jeonse_price`, `created_at`, `updated_at`, `status`) VALUES
	(32, 4, '1', '서울 강남구 논현로123길 4-1', ' (논현동)', '2', 'z.jpg', 3.00, 4.00, '2024-07-07 05:02:50', '2024-07-07 07:46:42', '판매 완료'),
	(34, 4, '1', '서울 강남구 논현로123길 4-1', ' (논현동)', '2', 'z.jpg', 3.00, 4.00, '2024-07-07 05:15:03', '2024-07-07 14:49:56', '판매 완료'),
	(44, 4, '1', '서울 강북구 삼양로142길 6-4', ' (우이동)', '2', '', 3.00, 4.00, '2024-07-08 11:21:46', '2024-07-08 10:28:25', '판매중'),
	(45, 3, '1', '강원특별자치도 춘천시 하한계길 5', ' (신동)', '2', '', 30000000.00, 20000000.00, '2024-07-08 12:49:15', '2024-07-08 03:59:52', '판매 완료'),
	(46, 3, '1', '서울 강남구 테헤란로22길 55', ' (역삼동, 호호빌)', '123', 'z.jpg', 5.00, 5.00, '2024-07-08 13:28:26', '2024-07-08 10:32:21', '판매중'),
	(48, 3, '1', '경기 성남시 분당구 서판교로 29', ' (판교동, 판교원마을)', '35', 'z.jpg', 20.00, 20.00, '2024-07-08 13:29:19', '2024-07-08 10:32:12', '판매중'),
	(49, 4, '12312312', '서울 강남구 밤고개로14길 6', ' (자곡동)', '312312', '', 31.00, 23.00, '2024-07-08 13:29:28', '2024-07-08 10:23:21', '판매중'),
	(50, 4, '12313', '서울 송파구 가락로12길 5', ' (석촌동)', '1231', 'z.jpg', 123.00, 123.00, '2024-07-08 13:29:43', '2024-07-08 10:50:10', '판매중'),
	(51, 4, '1', '서울 강동구 상암로12길 8', ' (천호동)', '123', 'z.jpg', 1231231.00, 99999999.99, '2024-07-08 13:32:23', '2024-07-08 06:47:52', '판매 완료'),
	(52, 4, '1', '서울 광진구 천호대로123길 4-4', ' (중곡동)', '22312312', 'js.png', 99.00, 4.00, '2024-07-08 15:19:25', '2024-07-08 10:50:21', '판매중'),
	(53, 4, '1', '서울 강남구 논현로123길 4-1', ' (논현동)', '2', 'z.jpg', 10.00, 20.00, '2024-07-08 15:46:55', '2024-07-08 10:50:04', '판매중'),
	(55, 4, '123', '서울 강남구 논현로123길 4-1', ' (논현동)', '1231231', 'js.png', 231.00, 23.00, '2024-07-08 19:32:39', '2024-07-08 10:34:49', '판매중'),
	(56, 4, '1123', '서울 강남구 논현로123길 4-1', ' (논현동)', '12312312', 'js.png', 312.00, 99.00, '2024-07-08 19:48:57', '2024-07-08 10:49:14', '판매중'),
	(57, 4, '123', '서울 강남구 논현로123길 4-1', ' (논현동)', '1231', 'js.png', 23123.00, 123.00, '2024-07-08 19:49:37', '2024-07-08 10:49:35', '판매중'),
	(58, 4, '123123', '서울 강남구 논현로123길 4-1', ' (논현동)', '131231', 'js.png', 2312312.00, 312312.00, '2024-07-08 19:49:56', '2024-07-08 10:49:54', '판매중'),
	(60, 4, '123', '서울 강남구 논현로123길 4-1', ' (논현동)', '123', 'html5.png', 1231.00, 123123.00, '2024-07-08 19:52:59', '2024-07-08 10:52:58', '판매중'),
	(61, 4, '123', '서울 강남구 논현로123길 4-1', ' (논현동)', '123123', 'js.png', 1231.00, 23123123.00, '2024-07-08 19:53:32', '2024-07-08 10:53:30', '판매중'),
	(62, 4, '123', '서울 강남구 논현로123길 4-1', ' (논현동)', '123', 'html5.png', 1231231.00, 23123123.00, '2024-07-08 19:55:32', '2024-07-08 10:55:30', '판매중'),
	(63, 4, '123', '서울 광진구 천호대로123길 4-4', ' (중곡동)', '123', 'html5.png', 123123.00, 123123.00, '2024-07-08 19:55:44', '2024-07-08 10:55:43', '판매중'),
	(64, 4, '1111', '서울 광진구 천호대로123길 4-4', ' (중곡동)', '2222', '', 3333.00, 344444.00, '2024-07-08 20:38:18', '2024-07-08 14:15:20', '판매 완료'),
	(65, 4, '123123', '서울 광진구 천호대로123길 4-4', ' (중곡동)', '12312312', '', 123123123.00, 12312313.00, '2024-07-08 20:39:27', '2024-07-08 11:39:27', '판매중');

-- 테이블 mybank.transactions 구조 내보내기
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_number` varchar(255) NOT NULL,
  `transaction_type` enum('deposit','withdraw','exchange') NOT NULL,
  `counterparty_name` varchar(255) DEFAULT NULL,
  `amount` decimal(18,2) NOT NULL,
  `balance` decimal(18,2) NOT NULL,
  `transaction_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `account_number` (`account_number`) USING BTREE,
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`account_number`) REFERENCES `accounts` (`account_number`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=141 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 mybank.transactions:~46 rows (대략적) 내보내기
INSERT INTO `transactions` (`id`, `account_number`, `transaction_type`, `counterparty_name`, `amount`, `balance`, `transaction_date`) VALUES
	(81, '473402100405', 'deposit', NULL, 99999999.99, 99999999.99, '2024-07-07 13:50:38'),
	(82, '473402100405', 'withdraw', NULL, 2000000.00, 97999999.99, '2024-07-07 13:55:37'),
	(83, '473402100405', 'exchange', 'Minibank(USD환전)', 13775600.00, 84224399.99, '2024-07-07 13:55:57'),
	(84, '287856788463', 'deposit', NULL, 50000000.00, 50000000.00, '2024-07-07 13:56:32'),
	(85, '287856788463', 'withdraw', 'aaaa', 2000000.00, 48000000.00, '2024-07-07 13:57:09'),
	(86, '473402100405', 'deposit', 'qqqq', 2000000.00, 86224399.99, '2024-07-07 13:57:09'),
	(87, '473402100405', 'deposit', 'aaaa', 30000.00, 86254399.99, '2024-07-07 14:33:54'),
	(88, '287856788463', 'withdraw', 'aaaa', 333.00, 47999667.00, '2024-07-07 14:34:34'),
	(89, '473402100405', 'deposit', 'qqqq', 333.00, 86254732.99, '2024-07-07 14:34:34'),
	(90, '275172212446', 'deposit', NULL, 5000000.00, 5000000.00, '2024-07-07 14:55:11'),
	(91, '275172212446', 'deposit', 'aaaa', 2000000.00, 7000000.00, '2024-07-07 14:55:22'),
	(92, '275172212446', 'deposit', 'aaaa', 200.00, 7000200.00, '2024-07-07 14:55:49'),
	(93, '275172212446', 'withdraw', NULL, 20000.00, 6980200.00, '2024-07-07 14:57:45'),
	(94, '473402100405', 'deposit', NULL, 200.00, 86254932.99, '2024-07-07 14:59:02'),
	(95, '952544220211', 'deposit', NULL, 100.00, 100.00, '2024-07-08 01:45:24'),
	(96, '873702267922', 'deposit', NULL, 1000000.00, 1000000.00, '2024-07-08 01:54:33'),
	(97, '498705539316', 'deposit', NULL, 100000.00, 100000.00, '2024-07-08 01:56:29'),
	(98, '952544220211', 'deposit', NULL, 100000.00, 100100.00, '2024-07-08 01:56:45'),
	(99, '952544220211', 'deposit', NULL, 100000.00, 200100.00, '2024-07-08 01:59:06'),
	(100, '620056349927', 'deposit', NULL, 1000.00, 1000.00, '2024-07-08 01:59:46'),
	(101, '952544220211', 'deposit', NULL, 900.00, 201000.00, '2024-07-08 02:00:02'),
	(102, '174683042871', 'deposit', NULL, 100.00, 100.00, '2024-07-08 02:00:55'),
	(103, '555598612211', 'deposit', NULL, 10000.00, 10000.00, '2024-07-08 02:02:41'),
	(104, '620056349927', 'deposit', NULL, 10000.00, 11000.00, '2024-07-08 02:05:21'),
	(105, '853280092296', 'deposit', NULL, 10000.00, 10000.00, '2024-07-08 02:06:50'),
	(106, '952544220211', 'deposit', NULL, 1000.00, 202000.00, '2024-07-08 02:09:23'),
	(107, '952544220211', 'deposit', NULL, 1000.00, 203000.00, '2024-07-08 02:10:03'),
	(108, '307856489143', 'deposit', NULL, 1000000.00, 1000000.00, '2024-07-08 02:10:42'),
	(109, '620056349927', 'deposit', NULL, 10000.00, 21000.00, '2024-07-08 02:11:40'),
	(110, '952544220211', 'deposit', NULL, 1000.00, 204000.00, '2024-07-08 02:13:00'),
	(111, '620056349927', 'deposit', NULL, 10000.00, 31000.00, '2024-07-08 02:13:07'),
	(112, '952544220211', 'deposit', NULL, 10000.00, 214000.00, '2024-07-08 02:15:14'),
	(113, '952544220211', 'deposit', NULL, 100000.00, 314000.00, '2024-07-08 02:22:05'),
	(114, '952544220211', 'withdraw', NULL, 4000.00, 310000.00, '2024-07-08 02:26:13'),
	(115, '952544220211', 'withdraw', 'abcd', 300000.00, 10000.00, '2024-07-08 02:26:48'),
	(116, '873702267922', 'deposit', 'abcd', 300000.00, 1300000.00, '2024-07-08 02:26:48'),
	(117, '873702267922', 'exchange', 'Minibank(USD환전)', 964292.00, 335708.00, '2024-07-08 02:27:24'),
	(118, '458253016255', 'deposit', NULL, 99999999.99, 99999999.99, '2024-07-08 02:30:06'),
	(119, '952544220211', 'deposit', NULL, 90000.00, 100000.00, '2024-07-08 02:50:02'),
	(120, '759960019379', 'deposit', NULL, 5000000.00, 5000000.00, '2024-07-08 05:34:36'),
	(121, '759960019379', 'deposit', NULL, 2000000.00, 7000000.00, '2024-07-08 05:34:57'),
	(122, '759960019379', 'withdraw', NULL, 1000000.00, 6000000.00, '2024-07-08 05:35:18'),
	(123, '473402100405', 'withdraw', 'naver-oFlyh1xIrkXgp3B4-azd-SPeymCOD3bmtLrwD4ilrQM', 222.00, 86254710.99, '2024-07-08 05:35:56'),
	(124, '759960019379', 'deposit', 'aaaa', 222.00, 6000222.00, '2024-07-08 05:35:56'),
	(125, '759960019379', 'exchange', 'Minibank(USD환전)', 413268.00, 5586954.00, '2024-07-08 05:49:13'),
	(126, '165912974719', 'deposit', NULL, 60000000.00, 60000000.00, '2024-07-08 06:13:19');

-- 테이블 mybank.users 구조 내보내기
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userid` varchar(255) NOT NULL,
  `userpw` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `salt` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `nickname` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '고객',
  `birthday` date NOT NULL,
  `try_count` int NOT NULL DEFAULT '0',
  `is_locked` tinyint(1) NOT NULL DEFAULT '0',
  `userpw_updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `userid` (`userid`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 mybank.users:~12 rows (대략적) 내보내기
INSERT INTO `users` (`id`, `userid`, `userpw`, `salt`, `email`, `nickname`, `birthday`, `try_count`, `is_locked`, `userpw_updated_at`, `created_at`, `updated_at`) VALUES
	(1, 'admin', '9ed4fd6f869ed0f758787d9a69b316c639b62fcb97dc8e0c69a4bda65ef1dfeb', '65c2acb0e1414b44db347e179a8848a5', 'admin@naver.com', '관리자', '2024-07-04', 0, 0, '2024-04-03 15:23:42', '2024-07-03 15:23:42', '2024-07-09 04:14:55'),
	(2, 'abcd', 'c1b96a2be34122f42ac951c0d29154ab6b8be51f887447c0263984a312eb9a68', 'f67b1aafb11764b83f9bbb0ee8450233', 'abcd_mini@gmail.com', '김철수', '1997-06-07', 0, 0, '2024-07-05 16:53:09', '2024-07-03 15:50:24', '2024-07-30 15:56:30'),
	(3, 'aaaa', 'f6d07ff3089a14c8e1ac2b60d7daa9ff3b080729e4283d1bf4b8b209ca031142', 'f74b3976c4ef2c7de13d13905630a2c3', 'aaaa@naver.com', '고객', '2024-07-04', 0, 0, '2024-07-04 05:22:56', '2024-07-04 05:22:56', '2024-07-08 11:43:24'),
	(4, 'qqqq', '78fa3b80d6c4b08cb4dbde728f33188709c81ab85f3f698c94f4608c44111ac5', 'b256db781d5b28a44d77af03da15b16d', 'qqqq@naver.com', '고객', '2024-07-04', 0, 0, '2024-07-04 09:04:19', '2024-07-04 09:04:19', '2024-07-08 11:43:25'),
	(5, 'abcde', 'f360289008df54d5ee7b0500b9bbca3b0ba3d9a50dd737b259cbf76e0988f202', 'e061ef270735c504b9e931fff7e4b532', 'abcde@naver.com', '고객', '2024-07-04', 0, 0, '2024-07-04 14:25:10', '2024-07-04 14:25:10', '2024-07-08 11:43:26'),
	(8, 'abcdabcd', 'b5414889e2f8e5c03ff7aa036231a36983a3253316f2edb6282dd0ceb5a48f93', '54c451794430d15ea38e9a7ee9678a7d', '20240707@naver.com', '고객', '2024-07-07', 0, 0, '2024-07-07 11:41:24', '2024-07-07 07:59:29', '2024-07-08 11:43:26'),
	(9, 'wwww', '51caff41b8d703c15d314cb039fbfffe3f22ba5bc0a26360a9844fcaecbe4e94', 'bae4fe42f746a2265cac746562ae3d19', '123@123.123', '고객', '2024-07-08', 0, 0, '2024-07-07 15:31:53', '2024-07-07 15:31:53', '2024-07-08 11:43:26'),
	(11, 'qwer', 'b69a9979f4e704ec562f58a81f5f3a43b0e003ed86ace3658e1d65f269e1042e', '49f967a6b17dc9013fcee69e026dc25f', 'qwer@naver.com', '고객', '2024-07-03', 0, 0, '2024-07-07 17:49:48', '2024-07-07 17:49:48', '2024-07-08 11:43:27'),
	(12, 'naver-p66Kk-TtbF9dDgtjA0yqjHo7jek0VQ6rKQQGP7z-JcM', 'naver', 'naver', 'poolly1004@naver.com', '고객', '2000-04-27', 0, 0, '2024-07-07 17:58:03', '2024-07-07 17:58:03', '2024-07-08 11:43:28'),
	(17, 'abcd1234', '19259b89fbe0c35642427b0ac27f26e85c83a81d231762d6803ecbcc738b1333', '822e9881be74c0f4fff291e58c67699a', 'abcd1234@gmail.com', '고객', '2024-07-08', 0, 0, '2024-07-08 02:29:48', '2024-07-08 02:29:48', '2024-07-08 11:43:28'),
	(20, 'naver-oFlyh1xIrkXgp3B4-azd-SPeymCOD3bmtLrwD4ilrQM', 'naver', 'naver', 'soeun0613@naver.com', '고객', '2000-06-13', 0, 0, '2024-07-08 05:33:08', '2024-07-08 05:33:08', '2024-07-08 11:43:29'),
	(21, 'hello', '9a4bac420be26d6e0391604afc5db7ee5564d516fd0e5f27062ee45b65fd7bb2', '430835e9df8ea85462dec5e0839fe34c', 'helloworld@naver.com', '스', '1997-06-07', 0, 0, '2024-07-08 13:36:47', '2024-07-08 13:36:13', '2024-07-08 13:36:47');

-- 모든 사용자에게 모든 사설 IP에서의 접근 허용
GRANT ALL PRIVILEGES ON *.* TO '%'@'%';
FLUSH PRIVILEGES;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
