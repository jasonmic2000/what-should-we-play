CREATE TABLE "catalog_games" (
	"app_id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_free" boolean DEFAULT false,
	"price_text" text,
	"price_currency" text,
	"has_online_coop" boolean,
	"has_online_pvp" boolean,
	"has_lan" boolean,
	"has_shared_split_screen" boolean,
	"is_group_playable" boolean,
	"catalog_last_synced_at" timestamp with time zone,
	"store_last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_sync_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_type" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"items_processed" integer DEFAULT 0 NOT NULL,
	"last_app_id" integer,
	"last_modified_since" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
