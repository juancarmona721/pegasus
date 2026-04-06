-- CreateTable
CREATE TABLE `clanes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `hora_entrada` TIME NOT NULL,
    `hora_salida` TIME NOT NULL,
    `tiempo_alimentacion_minutos` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `clanes_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lideres` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `correo` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `rol` ENUM('tl_desarrollo', 'tl_ingles', 'tl_habilidades', 'admin') NOT NULL DEFAULT 'tl_desarrollo',
    `clan_id` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `lideres_correo_key`(`correo`),
    INDEX `lideres_clan_id_rol_idx`(`clan_id`, `rol`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cedula` VARCHAR(50) NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `moodle_id` INTEGER NOT NULL,
    `clan_id` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `coder_cedula_key`(`cedula`),
    UNIQUE INDEX `coder_email_key`(`email`),
    UNIQUE INDEX `coder_moodle_id_key`(`moodle_id`),
    INDEX `coder_clan_id_is_active_idx`(`clan_id`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `correos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `coder_id` INTEGER NOT NULL,
    `tipo_correo` VARCHAR(80) NOT NULL DEFAULT 'ausencia',
    `estado` ENUM('pendiente', 'enviado', 'fallido') NOT NULL DEFAULT 'pendiente',
    `fecha_envio` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `correos_coder_id_estado_idx`(`coder_id`, `estado`),
    INDEX `correos_estado_fecha_envio_idx`(`estado`, `fecha_envio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lideres` ADD CONSTRAINT `lideres_clan_id_fkey` FOREIGN KEY (`clan_id`) REFERENCES `clanes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coder` ADD CONSTRAINT `coder_clan_id_fkey` FOREIGN KEY (`clan_id`) REFERENCES `clanes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `correos` ADD CONSTRAINT `correos_coder_id_fkey` FOREIGN KEY (`coder_id`) REFERENCES `coder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
