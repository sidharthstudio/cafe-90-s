CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product` text NOT NULL,
	`name` text NOT NULL,
	`variant` text NOT NULL,
	`qty` integer NOT NULL,
	`price` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`created` integer NOT NULL,
	`status` text NOT NULL,
	`customer` text NOT NULL,
	`subtotal` integer NOT NULL,
	`fee` integer NOT NULL,
	`payment` text NOT NULL,
	`gateway` text
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
