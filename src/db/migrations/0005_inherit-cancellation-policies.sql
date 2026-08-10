-- The previous additive schema temporarily forced every package to 0%, so
-- those rows cannot represent "no override". No CMS existed to author a real
-- 0% override. Clear only that inherited development default so destination
-- and global policy precedence can operate for existing seeded packages.
UPDATE "packages"
SET "cancellation_fee_percentage" = NULL
WHERE "cancellation_fee_percentage" = 0;
