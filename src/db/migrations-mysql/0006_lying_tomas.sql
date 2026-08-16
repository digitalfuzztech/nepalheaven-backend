ALTER TABLE `packages` ADD `cancellation_fee_type` enum('fixed','percentage');--> statement-breakpoint
ALTER TABLE `packages` ADD `cancellation_fee_value` decimal(12,2);--> statement-breakpoint
ALTER TABLE `packages` ADD `cancellation_policy_text` text;--> statement-breakpoint
UPDATE `packages`
SET `cancellation_fee_type` = 'percentage',
    `cancellation_fee_value` = `cancellation_fee_percentage`
WHERE `cancellation_fee_percentage` IS NOT NULL;--> statement-breakpoint
ALTER TABLE `booking_intents` ADD `cancellation_fee_type_snapshot` enum('fixed','percentage') DEFAULT 'percentage' NOT NULL;--> statement-breakpoint
ALTER TABLE `booking_intents` ADD `cancellation_fee_value_snapshot` decimal(12,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `booking_intents` ADD `cancellation_policy_text_snapshot` text;--> statement-breakpoint
UPDATE `booking_intents`
SET `cancellation_fee_type_snapshot` = 'percentage',
    `cancellation_fee_value_snapshot` = `cancellation_fee_percentage_snapshot`;--> statement-breakpoint
ALTER TABLE `bookings` ADD `cancellation_fee_type_snapshot` enum('fixed','percentage') DEFAULT 'percentage' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `cancellation_fee_value_snapshot` decimal(12,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `cancellation_policy_text_snapshot` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `amount_paid_at_cancellation_snapshot` decimal(12,2);--> statement-breakpoint
ALTER TABLE `bookings` ADD `previously_refunded_amount_snapshot` decimal(12,2);--> statement-breakpoint
ALTER TABLE `bookings` ADD `refund_processing_deadline` datetime(3);
--> statement-breakpoint
UPDATE `bookings`
SET `cancellation_fee_type_snapshot` = 'percentage',
    `cancellation_fee_value_snapshot` = COALESCE(`cancellation_fee_percentage_snapshot`, '0.00');
--> statement-breakpoint
UPDATE `bookings` AS `b`
SET `amount_paid_at_cancellation_snapshot` = COALESCE((
      SELECT SUM(`p`.`amount`)
      FROM `payments` AS `p`
      WHERE `p`.`booking_id` = `b`.`id`
        AND `p`.`status` = 'paid'
        AND (`p`.`purpose` IS NULL OR `p`.`purpose` <> 'refund')
    ), 0.00),
    `previously_refunded_amount_snapshot` = COALESCE((
      SELECT SUM(`p`.`amount`)
      FROM `payments` AS `p`
      WHERE `p`.`booking_id` = `b`.`id`
        AND (`p`.`status` = 'refunded' OR (`p`.`status` = 'paid' AND `p`.`purpose` = 'refund'))
    ), 0.00),
    `refund_processing_deadline` = CASE
      WHEN COALESCE(`b`.`refund_amount`, 0.00) > 0 AND `b`.`cancelled_at` IS NOT NULL
        THEN DATE_ADD(`b`.`cancelled_at`, INTERVAL 15 DAY)
      ELSE NULL
    END
WHERE `b`.`cancelled_at` IS NOT NULL;
