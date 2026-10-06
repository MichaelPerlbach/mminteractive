CREATE TABLE tt_content (
	tx_mminteractive_map int(10) unsigned DEFAULT '0' NOT NULL,
	tx_mminteractive_position varchar(10) DEFAULT 'relative' NOT NULL,
	tx_mminteractive_x decimal(10,2) DEFAULT NULL,
	tx_mminteractive_x_unit varchar(2) DEFAULT 'px' NOT NULL,
	tx_mminteractive_y decimal(10,2) DEFAULT NULL,
	tx_mminteractive_y_unit varchar(2) DEFAULT 'px' NOT NULL,
	tx_mminteractive_margin_top int(11) DEFAULT '0' NOT NULL,
	tx_mminteractive_margin_bottom int(11) DEFAULT '0' NOT NULL
);

CREATE TABLE tx_mminteractive_domain_model_imagemap (
	title varchar(255) DEFAULT '' NOT NULL,
	areas mediumtext
);
