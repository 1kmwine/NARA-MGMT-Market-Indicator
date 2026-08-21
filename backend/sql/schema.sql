-- 선행지표 대시보드 스키마 (테스트 서버 192.168.47.105 MariaDB 11.8.6)
-- 허브 아키텍처의 "블록별 스키마 분리" 원칙에 따라 leading_indicator 스키마를 전용으로 쓴다.
-- (DB_ID_STRATEGY 계정에 이 스키마 ALL PRIVILEGES가 이미 부여돼 있음)
--
-- 적용:  python -m etl --init    또는
--        mariadb -u DB_ID_STRATEGY -p -h 192.168.47.105 < sql/schema.sql

CREATE DATABASE IF NOT EXISTS `leading_indicator`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `leading_indicator`;

-- 지표 마스터: 어떤 지표를 어느 기관 어느 통계표에서 가져오는지
CREATE TABLE IF NOT EXISTS `indicator` (
  `code`         varchar(30)  NOT NULL COMMENT '지표 코드 (csi/income/alcohol)',
  `name`         varchar(100) NOT NULL COMMENT '화면 표기명',
  `source_org`   varchar(20)  NOT NULL COMMENT '출처 기관 (ECOS/KOSIS)',
  `source_table` varchar(50)  NOT NULL COMMENT '통계표코드 (511Y002, DT_1L9U118 등)',
  `source_param` varchar(100) DEFAULT NULL COMMENT '항목 파라미터 (itemCode / itmId+objL1)',
  `unit`         varchar(20)  NOT NULL COMMENT '단위 (지수, 원 등)',
  `period_type`  char(1)      NOT NULL COMMENT '주기 M=월 Q=분기',
  `note`         varchar(500) DEFAULT NULL COMMENT '산출 기준 설명',
  `updated_at`   datetime     NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='선행지표 마스터';

-- 지표 실측 시계열: 대시보드가 그리는 숫자가 전부 여기 들어간다
CREATE TABLE IF NOT EXISTS `indicator_value` (
  `id`             bigint(20)   NOT NULL AUTO_INCREMENT,
  `indicator_code` varchar(30)  NOT NULL,
  `period`         varchar(6)   NOT NULL COMMENT 'M=YYYYMM(202604), Q=YYYYQQ(202601=1분기)',
  `label`          varchar(20)  NOT NULL COMMENT "화면 표기 라벨 ('26.04, '26 Q1)",
  `value`          decimal(18,4) NOT NULL COMMENT '원지표값 (CSI 지수 / 가구당 월평균 원)',
  `yoy_pct`        decimal(8,2) DEFAULT NULL COMMENT '전년동기대비 증감률(%). 분기 지표만 사용',
  `origin`         varchar(10)  NOT NULL DEFAULT 'live' COMMENT 'live=API 실측, fallback=스냅샷',
  `collected_at`   datetime     NOT NULL DEFAULT current_timestamp() COMMENT '수집 시각',
  `updated_at`     datetime     NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_indicator_period` (`indicator_code`,`period`),
  KEY `ix_indicator_value_period` (`period`),
  CONSTRAINT `fk_indicator_value_indicator` FOREIGN KEY (`indicator_code`)
    REFERENCES `indicator` (`code`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='선행지표 시계열 실측치';

-- 수집 이력: 언제 어떤 지표를 몇 건 적재했고 실패했다면 왜 실패했는지
CREATE TABLE IF NOT EXISTS `fetch_log` (
  `id`             bigint(20)   NOT NULL AUTO_INCREMENT,
  `indicator_code` varchar(30)  NOT NULL,
  `status`         varchar(10)  NOT NULL COMMENT 'success / failed',
  `origin`         varchar(10)  NOT NULL COMMENT 'live / fallback',
  `row_count`      int(11)      NOT NULL DEFAULT 0 COMMENT '적재(upsert)된 행 수',
  `message`        varchar(500) DEFAULT NULL COMMENT '실패 사유',
  `started_at`     datetime     NOT NULL,
  `finished_at`    datetime     NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_fetch_log_indicator` (`indicator_code`,`finished_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='선행지표 수집 이력';
